import express from 'express';
import { withTransaction } from '../../database/pool.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { parseDateTimeInput } from '../../utils/dates.js';
import { Errors } from '../../utils/errors.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';
import { serializeComment, serializeTask } from '../../utils/serializers.js';
import { validate } from '../../utils/validate.js';
import { authenticate } from '../../middleware/auth.js';
import * as activityRepository from '../../repositories/activityRepository.js';
import * as commentRepository from '../../repositories/commentRepository.js';
import * as projectRepository from '../../repositories/projectRepository.js';
import * as taskRepository from '../../repositories/taskRepository.js';
import * as userRepository from '../../repositories/userRepository.js';
import {
  assertProjectAccess,
  assertProjectWritable,
  assertTaskAccess,
  ensureProjectWritableStatus,
} from '../../services/accessControl.js';
import {
  notifyTaskAssigned,
  notifyTaskStatusChanged,
} from '../../services/notificationService.js';
import {
  commentBodySchema,
  commentParamsSchema,
  createTaskSchema,
  listTasksQuerySchema,
  projectTaskParamsSchema,
  taskParamsSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from './tasks.schemas.js';

export const projectTasksRouter = express.Router({ mergeParams: true });
export const tasksRouter = express.Router();
export const commentsRouter = express.Router();

projectTasksRouter.use(authenticate);
tasksRouter.use(authenticate);
commentsRouter.use(authenticate);

async function loadProject(req, { manage = false, writable = false } = {}) {
  const projectId = req.valid.params.projectId;
  const row = await projectRepository.findProjectAccess(projectId, req.user.id);
  const permissions = assertProjectAccess(row, req.user, { manage });
  if (writable) {
    assertProjectWritable(row);
  }
  return { projectId, row, permissions };
}

async function loadTask(req) {
  const taskId = req.valid.params.taskId;
  const row = await taskRepository.findTaskAccess(taskId, req.user.id);
  const permissions = assertTaskAccess(row, req.user);
  return { taskId, row, permissions };
}

async function assertAssigneeIsProjectMember(projectId, ownerId, assigneeId) {
  if (!assigneeId) return;
  const user = await userRepository.findUserById(assigneeId);
  if (!user || !user.is_active) {
    throw Errors.unprocessable('Le responsable doit être un utilisateur actif.', [
      { field: 'assigneeId', message: 'Utilisateur introuvable ou inactif.' },
    ]);
  }
  if (Number(assigneeId) === Number(ownerId)) return;
  const member = await projectRepository.findMember(projectId, assigneeId);
  if (!member) {
    throw Errors.unprocessable('Le responsable doit être membre du projet.', [
      { field: 'assigneeId', message: "Cet utilisateur n'est pas membre du projet." },
    ]);
  }
}

function toTaskFields(body) {
  const fields = {};
  if (body.title !== undefined) fields.title = body.title;
  if (body.description !== undefined) fields.description = body.description;
  if (body.status !== undefined) fields.status = body.status;
  if (body.priority !== undefined) fields.priority = body.priority;
  if (body.assigneeId !== undefined) fields.assigneeId = body.assigneeId;
  if (body.dueDate !== undefined) fields.dueDate = parseDateTimeInput(body.dueDate);
  return fields;
}

projectTasksRouter.get(
  '/',
  validate({ params: projectTaskParamsSchema, query: listTasksQuerySchema }),
  asyncHandler(async (req, res) => {
    const { projectId } = await loadProject(req);
    const query = req.valid.query;
    const pagination = parsePagination(query);

    const { rows, total } = await taskRepository.listTasks(req.user, {
      projectId,
      status: query.status,
      priority: query.priority,
      assigneeId: query.assigneeId,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      limit: pagination.limit,
      offset: pagination.offset,
    });

    return res.status(200).json({
      success: true,
      data: rows.map(serializeTask),
      meta: paginationMeta(total, pagination.page, pagination.limit),
    });
  }),
);

projectTasksRouter.post(
  '/',
  validate({ params: projectTaskParamsSchema, body: createTaskSchema }),
  asyncHandler(async (req, res) => {
    const { projectId, row: project } = await loadProject(req, { manage: true, writable: true });
    const body = req.valid.body;
    await assertAssigneeIsProjectMember(projectId, project.owner_id, body.assigneeId ?? null);

    const status = body.status ?? 'TODO';
    const taskId = await withTransaction(async (connection) => {
      const id = await taskRepository.createTask(
        {
          projectId,
          title: body.title,
          description: body.description ?? null,
          status,
          priority: body.priority ?? 'MEDIUM',
          assigneeId: body.assigneeId ?? null,
          createdBy: req.user.id,
          dueDate: parseDateTimeInput(body.dueDate),
          completedAt: status === 'DONE' ? new Date() : null,
        },
        connection,
      );

      await activityRepository.insertActivity(
        {
          actorId: req.user.id,
          projectId,
          taskId: id,
          action: 'TASK_CREATED',
          description: `Created task "${body.title}"`,
        },
        connection,
      );

      if (body.assigneeId) {
        await notifyTaskAssigned(
          { task: { id, title: body.title }, project, actor: req.user, assigneeId: body.assigneeId },
          connection,
        );
      }

      return id;
    });

    const task = await taskRepository.findTaskById(taskId);
    return res.status(201).json({ success: true, data: serializeTask(task) });
  }),
);

tasksRouter.get(
  '/',
  validate({ query: listTasksQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = req.valid.query;
    const pagination = parsePagination(query);

    const { rows, total } = await taskRepository.listTasks(req.user, {
      projectId: query.projectId,
      status: query.status,
      priority: query.priority,
      assigneeId: query.assigneeId,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      limit: pagination.limit,
      offset: pagination.offset,
    });

    return res.status(200).json({
      success: true,
      data: rows.map(serializeTask),
      meta: paginationMeta(total, pagination.page, pagination.limit),
    });
  }),
);

tasksRouter.get(
  '/:taskId',
  validate({ params: taskParamsSchema }),
  asyncHandler(async (req, res) => {
    const { row } = await loadTask(req);
    return res.status(200).json({ success: true, data: serializeTask(row) });
  }),
);

async function applyStatusChange(req, taskRow, nextStatus, { notify = true } = {}) {
  if (nextStatus === taskRow.status) {
    return taskRow;
  }

  await withTransaction(async (connection) => {
    await taskRepository.updateTask(
      taskRow.id,
      {
        status: nextStatus,
        completedAt: nextStatus === 'DONE' ? new Date() : null,
      },
      connection,
    );

    await activityRepository.insertActivity(
      {
        actorId: req.user.id,
        projectId: taskRow.project_id,
        taskId: taskRow.id,
        action: nextStatus === 'DONE' ? 'TASK_COMPLETED' : 'STATUS_CHANGED',
        description:
          nextStatus === 'DONE'
            ? `Completed "${taskRow.title}"`
            : `Moved "${taskRow.title}" to ${nextStatus}`,
      },
      connection,
    );

    if (notify) {
      await notifyTaskStatusChanged(
        {
          task: taskRow,
          project: { id: taskRow.project_id, name: taskRow.project_name },
          actor: req.user,
          assigneeId: taskRow.assignee_id,
          ownerId: taskRow.project_owner_id,
          previousStatus: taskRow.status,
          nextStatus,
        },
        connection,
      );
    }
  });

  return taskRepository.findTaskById(taskRow.id);
}

tasksRouter.patch(
  '/:taskId',
  validate({ params: taskParamsSchema, body: updateTaskSchema }),
  asyncHandler(async (req, res) => {
    const { row: taskRow, permissions } = await loadTask(req);
    const body = req.valid.body;
    ensureProjectWritableStatus(taskRow.project_status);

    const changesStatusOnly = Object.keys(body).every((key) => key === 'status');
    const actingAsAssignee = !permissions.canManage && permissions.canChangeStatus && changesStatusOnly;

    if (!permissions.canManage && !actingAsAssignee) {
      throw Errors.forbidden('Vous ne pouvez pas modifier cette tâche.');
    }

    if (actingAsAssignee) {
      const updated = await applyStatusChange(req, taskRow, body.status);
      return res.status(200).json({ success: true, data: serializeTask(updated) });
    }

    const fields = toTaskFields(body);

    if (body.assigneeId !== undefined && body.assigneeId !== null) {
      await assertAssigneeIsProjectMember(taskRow.project_id, taskRow.project_owner_id, body.assigneeId);
    }

    if (body.status !== undefined) {
      fields.completedAt = body.status === 'DONE' ? new Date() : null;
    }

    await withTransaction(async (connection) => {
      await taskRepository.updateTask(taskRow.id, fields, connection);

      await activityRepository.insertActivity(
        {
          actorId: req.user.id,
          projectId: taskRow.project_id,
          taskId: taskRow.id,
          action: 'TASK_UPDATED',
          description: `Updated task "${body.title ?? taskRow.title}"`,
        },
        connection,
      );

      if (body.status !== undefined && body.status !== taskRow.status) {
        await notifyTaskStatusChanged(
          {
            task: taskRow,
            project: { id: taskRow.project_id, name: taskRow.project_name },
            actor: req.user,
            assigneeId: taskRow.assignee_id,
            ownerId: taskRow.project_owner_id,
            previousStatus: taskRow.status,
            nextStatus: body.status,
          },
          connection,
        );
      }

      if (
        body.assigneeId !== undefined &&
        body.assigneeId !== null &&
        Number(body.assigneeId) !== Number(taskRow.assignee_id)
      ) {
        await notifyTaskAssigned(
          {
            task: { id: taskRow.id, title: body.title ?? taskRow.title },
            project: { id: taskRow.project_id, name: taskRow.project_name },
            actor: req.user,
            assigneeId: body.assigneeId,
          },
          connection,
        );
      }
    });

    const updated = await taskRepository.findTaskById(taskRow.id);
    return res.status(200).json({ success: true, data: serializeTask(updated) });
  }),
);

tasksRouter.patch(
  '/:taskId/status',
  validate({ params: taskParamsSchema, body: updateTaskStatusSchema }),
  asyncHandler(async (req, res) => {
    const { row: taskRow, permissions } = await loadTask(req);
    ensureProjectWritableStatus(taskRow.project_status);

    if (!permissions.canChangeStatus) {
      throw Errors.forbidden('Vous ne pouvez pas changer le statut de cette tâche.');
    }

    const updated = await applyStatusChange(req, taskRow, req.valid.body.status);
    return res.status(200).json({ success: true, data: serializeTask(updated) });
  }),
);

tasksRouter.delete(
  '/:taskId',
  validate({ params: taskParamsSchema }),
  asyncHandler(async (req, res) => {
    const { row: taskRow, permissions } = await loadTask(req);
    ensureProjectWritableStatus(taskRow.project_status);

    if (!permissions.canManage) {
      throw Errors.forbidden('Vous ne pouvez pas supprimer cette tâche.');
    }

    await withTransaction(async (connection) => {
      await taskRepository.deleteTask(taskRow.id, connection);
      await activityRepository.insertActivity(
        {
          actorId: req.user.id,
          projectId: taskRow.project_id,
          taskId: null,
          action: 'TASK_DELETED',
          description: `Deleted task "${taskRow.title}"`,
        },
        connection,
      );
    });

    return res.status(200).json({ success: true, data: { message: 'Tâche supprimée.' } });
  }),
);

tasksRouter.get(
  '/:taskId/comments',
  validate({ params: taskParamsSchema }),
  asyncHandler(async (req, res) => {
    await loadTask(req);
    const rows = await commentRepository.listCommentsByTask(req.valid.params.taskId);
    return res.status(200).json({ success: true, data: rows.map(serializeComment) });
  }),
);

tasksRouter.post(
  '/:taskId/comments',
  validate({ params: taskParamsSchema, body: commentBodySchema }),
  asyncHandler(async (req, res) => {
    const { row: taskRow } = await loadTask(req);
    ensureProjectWritableStatus(taskRow.project_status);

    const commentId = await commentRepository.createComment({
      taskId: taskRow.id,
      authorId: req.user.id,
      content: req.valid.body.content,
    });

    const comment = await commentRepository.findCommentById(commentId);
    return res.status(201).json({ success: true, data: serializeComment(comment) });
  }),
);

function canManageTaskProject(taskRow, permissions) {
  return permissions.canManage || Boolean(permissions.isAdmin);
}

commentsRouter.patch(
  '/:commentId',
  validate({ params: commentParamsSchema, body: commentBodySchema }),
  asyncHandler(async (req, res) => {
    const comment = await commentRepository.findCommentById(req.valid.params.commentId);
    if (!comment || comment.deleted_at) {
      throw Errors.notFound('Commentaire introuvable.');
    }

    const taskRow = await taskRepository.findTaskAccess(comment.task_id, req.user.id);
    assertTaskAccess(taskRow, req.user);
    ensureProjectWritableStatus(taskRow.project_status);

    const canEdit = Number(comment.author_id) === req.user.id || req.user.role === 'ADMIN';
    if (!canEdit) {
      throw Errors.forbidden('Vous ne pouvez pas modifier ce commentaire.');
    }

    await commentRepository.updateCommentContent(comment.id, req.valid.body.content);
    const updated = await commentRepository.findCommentById(comment.id);
    return res.status(200).json({ success: true, data: serializeComment(updated) });
  }),
);

commentsRouter.delete(
  '/:commentId',
  validate({ params: commentParamsSchema }),
  asyncHandler(async (req, res) => {
    const comment = await commentRepository.findCommentById(req.valid.params.commentId);
    if (!comment || comment.deleted_at) {
      throw Errors.notFound('Commentaire introuvable.');
    }

    const taskRow = await taskRepository.findTaskAccess(comment.task_id, req.user.id);
    const permissions = assertTaskAccess(taskRow, req.user);
    ensureProjectWritableStatus(taskRow.project_status);

    const isAuthor = Number(comment.author_id) === req.user.id;
    if (!isAuthor && !canManageTaskProject(taskRow, permissions)) {
      throw Errors.forbidden('Vous ne pouvez pas supprimer ce commentaire.');
    }

    await commentRepository.softDeleteComment(comment.id);
    return res.status(200).json({ success: true, data: { message: 'Commentaire supprimé.' } });
  }),
);
