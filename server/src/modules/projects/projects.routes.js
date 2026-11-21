import express from 'express';
import { withTransaction } from '../../database/pool.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { Errors } from '../../utils/errors.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';
import {
  serializeActivity,
  serializeProject,
  serializeProjectMember,
} from '../../utils/serializers.js';
import { paginationQuerySchema } from '../../utils/schemas.js';
import { validate } from '../../utils/validate.js';
import { authenticate, requireRoles } from '../../middleware/auth.js';
import * as activityRepository from '../../repositories/activityRepository.js';
import * as projectRepository from '../../repositories/projectRepository.js';
import * as userRepository from '../../repositories/userRepository.js';
import { assertProjectAccess, assertProjectWritable } from '../../services/accessControl.js';
import { notifyProjectMemberAdded } from '../../services/notificationService.js';
import {
  addMemberSchema,
  createProjectSchema,
  listProjectsQuerySchema,
  memberParamsSchema,
  projectParamsSchema,
  updateProjectSchema,
} from './projects.schemas.js';

export const projectsRouter = express.Router();

projectsRouter.use(authenticate);

async function loadProject(req, { manage = false, writable = false } = {}) {
  const projectId = req.valid.params.projectId;
  const row = await projectRepository.findProjectAccess(projectId, req.user.id);
  const permissions = assertProjectAccess(row, req.user, { manage });
  if (writable) {
    assertProjectWritable(row);
  }
  return { projectId, row, permissions };
}

function validateDateRange(startDate, dueDate) {
  if (startDate && dueDate && dueDate < startDate) {
    throw Errors.unprocessable('La date de fin ne peut pas précéder la date de début.', [
      { field: 'dueDate', message: 'La date de fin doit être postérieure à la date de début.' },
    ]);
  }
}

projectsRouter.get(
  '/',
  validate({ query: listProjectsQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = req.valid.query;
    const pagination = parsePagination(query);
    const { rows, total } = await projectRepository.listProjects(req.user, {
      status: query.status,
      search: query.search,
      ownerId: query.ownerId,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      limit: pagination.limit,
      offset: pagination.offset,
    });

    return res.status(200).json({
      success: true,
      data: rows.map(serializeProject),
      meta: paginationMeta(total, pagination.page, pagination.limit),
    });
  }),
);

projectsRouter.post(
  '/',
  requireRoles('ADMIN', 'PROJECT_MANAGER'),
  validate({ body: createProjectSchema }),
  asyncHandler(async (req, res) => {
    const body = req.valid.body;
    const status = body.status ?? 'PLANNING';
    if (status === 'ARCHIVED') {
      throw Errors.unprocessable('Un projet ne peut pas être créé directement archivé.');
    }
    validateDateRange(body.startDate ?? null, body.dueDate ?? null);

    const projectId = await withTransaction(async (connection) => {
      const id = await projectRepository.createProject(
        {
          name: body.name,
          description: body.description ?? null,
          status,
          startDate: body.startDate ?? null,
          dueDate: body.dueDate ?? null,
          ownerId: req.user.id,
        },
        connection,
      );

      await projectRepository.addProjectMember(
        { projectId: id, userId: req.user.id, projectRole: 'MANAGER' },
        connection,
      );

      await activityRepository.insertActivity(
        {
          actorId: req.user.id,
          projectId: id,
          action: 'PROJECT_CREATED',
          description: `Created project "${body.name}"`,
        },
        connection,
      );

      return id;
    });

    const row = await projectRepository.findProjectById(projectId);
    return res.status(201).json({ success: true, data: serializeProject(row) });
  }),
);

projectsRouter.get(
  '/:projectId',
  validate({ params: projectParamsSchema }),
  asyncHandler(async (req, res) => {
    const { row, projectId } = await loadProject(req);
    const members = await projectRepository.listProjectMembers(projectId);

    return res.status(200).json({
      success: true,
      data: {
        ...serializeProject(row),
        members: members.map(serializeProjectMember),
      },
    });
  }),
);

projectsRouter.get(
  '/:projectId/activity',
  validate({ params: projectParamsSchema, query: paginationQuerySchema }),
  asyncHandler(async (req, res) => {
    const { projectId } = await loadProject(req);
    const pagination = parsePagination(req.valid.query, { defaultLimit: 20 });
    const { rows, total } = await activityRepository.listProjectActivity(projectId, {
      limit: pagination.limit,
      offset: pagination.offset,
    });

    return res.status(200).json({
      success: true,
      data: rows.map(serializeActivity),
      meta: paginationMeta(total, pagination.page, pagination.limit),
    });
  }),
);

projectsRouter.patch(
  '/:projectId',
  validate({ params: projectParamsSchema, body: updateProjectSchema }),
  asyncHandler(async (req, res) => {
    const { row, projectId } = await loadProject(req, { manage: true, writable: true });
    const body = req.valid.body;

    const nextStartDate = body.startDate !== undefined ? body.startDate : row.start_date;
    const nextDueDate = body.dueDate !== undefined ? body.dueDate : row.due_date;
    validateDateRange(nextStartDate, nextDueDate);

    const fields = {};
    if (body.name !== undefined) fields.name = body.name;
    if (body.description !== undefined) fields.description = body.description;
    if (body.startDate !== undefined) fields.startDate = body.startDate;
    if (body.dueDate !== undefined) fields.dueDate = body.dueDate;
    if (body.status !== undefined) {
      fields.status = body.status;
      if (body.status === 'ARCHIVED') {
        fields.archivedAt = new Date();
      }
    }

    await withTransaction(async (connection) => {
      await projectRepository.updateProject(projectId, fields, connection);
      await activityRepository.insertActivity(
        {
          actorId: req.user.id,
          projectId,
          action: 'PROJECT_UPDATED',
          description: `Updated project "${body.name ?? row.name}"`,
        },
        connection,
      );
    });

    const updated = await projectRepository.findProjectById(projectId);
    return res.status(200).json({ success: true, data: serializeProject(updated) });
  }),
);

projectsRouter.delete(
  '/:projectId',
  validate({ params: projectParamsSchema }),
  asyncHandler(async (req, res) => {
    const { row, projectId } = await loadProject(req, { manage: true });

    if (row.status !== 'ARCHIVED') {
      await withTransaction(async (connection) => {
        await projectRepository.archiveProject(projectId, connection);
        await activityRepository.insertActivity(
          {
            actorId: req.user.id,
            projectId,
            action: 'PROJECT_ARCHIVED',
            description: `Archived project "${row.name}"`,
          },
          connection,
        );
      });
    }

    const archived = await projectRepository.findProjectById(projectId);
    return res.status(200).json({ success: true, data: serializeProject(archived) });
  }),
);

projectsRouter.get(
  '/:projectId/members',
  validate({ params: projectParamsSchema }),
  asyncHandler(async (req, res) => {
    const { projectId } = await loadProject(req);
    const members = await projectRepository.listProjectMembers(projectId);
    return res.status(200).json({ success: true, data: members.map(serializeProjectMember) });
  }),
);

projectsRouter.post(
  '/:projectId/members',
  validate({ params: projectParamsSchema, body: addMemberSchema }),
  asyncHandler(async (req, res) => {
    const { row, projectId } = await loadProject(req, { manage: true, writable: true });
    const { userId, projectRole = 'MEMBER' } = req.valid.body;

    const target = await userRepository.findUserById(userId);
    if (!target || !target.is_active) {
      throw Errors.notFound('Utilisateur introuvable ou inactif.');
    }

    const existing = await projectRepository.findMember(projectId, userId);
    if (existing) {
      throw Errors.conflict('Cet utilisateur est déjà membre du projet.');
    }

    await withTransaction(async (connection) => {
      await projectRepository.addProjectMember({ projectId, userId, projectRole }, connection);
      await notifyProjectMemberAdded(
        { project: row, actor: req.user, addedUserId: userId },
        connection,
      );
      await activityRepository.insertActivity(
        {
          actorId: req.user.id,
          projectId,
          action: 'MEMBER_ADDED',
          description: `Added ${target.full_name} to project "${row.name}"`,
        },
        connection,
      );
    });

    const members = await projectRepository.listProjectMembers(projectId);
    const member = members.find((entry) => Number(entry.user_id) === userId);
    return res.status(201).json({ success: true, data: serializeProjectMember(member) });
  }),
);

projectsRouter.delete(
  '/:projectId/members/:userId',
  validate({ params: memberParamsSchema }),
  asyncHandler(async (req, res) => {
    const { row, projectId } = await loadProject(req, { manage: true, writable: true });
    const userId = req.valid.params.userId;

    if (userId === Number(row.owner_id)) {
      throw Errors.unprocessable('Le propriétaire du projet ne peut pas être retiré.');
    }

    const member = await projectRepository.findMember(projectId, userId);
    if (!member) {
      throw Errors.notFound('Ce membre ne fait pas partie du projet.');
    }

    const target = await userRepository.findUserById(userId);

    await withTransaction(async (connection) => {
      await projectRepository.removeProjectMember(projectId, userId, connection);
      await projectRepository.unassignRemovedMemberTasks(projectId, userId, connection);
      await activityRepository.insertActivity(
        {
          actorId: req.user.id,
          projectId,
          action: 'MEMBER_REMOVED',
          description: `Removed ${target?.full_name ?? `user #${userId}`} from project "${row.name}"`,
        },
        connection,
      );
    });

    return res.status(200).json({ success: true, data: { message: 'Membre retiré du projet.' } });
  }),
);
