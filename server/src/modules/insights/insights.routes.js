import express from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';
import { dateOnlySchema, idSchema, paginationQuerySchema } from '../../utils/schemas.js';
import { serializeActivity, serializeProject, serializeTask } from '../../utils/serializers.js';
import { validate } from '../../utils/validate.js';
import { authenticate } from '../../middleware/auth.js';
import * as activityRepository from '../../repositories/activityRepository.js';
import * as projectRepository from '../../repositories/projectRepository.js';
import * as taskRepository from '../../repositories/taskRepository.js';
import { assertProjectAccess } from '../../services/accessControl.js';

export const reportsRouter = express.Router();
export const activityRouter = express.Router();
export const calendarRouter = express.Router();
export const timelineRouter = express.Router();

reportsRouter.use(authenticate);
activityRouter.use(authenticate);
calendarRouter.use(authenticate);
timelineRouter.use(authenticate);

reportsRouter.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const [projectRows, taskRows] = await Promise.all([
      projectRepository.listAllProjectsForUser(req.user),
      taskRepository.listAllTasksForUser(req.user),
    ]);

    const projects = projectRows.map(serializeProject);
    const tasks = taskRows.map(serializeTask);

    const completedTasks = tasks.filter((task) => task.status === 'DONE').length;
    const pendingTasks = tasks.length - completedTasks;
    const overdueTasks = tasks.filter((task) => task.isOverdue).length;
    const overallProgress =
      tasks.length === 0 ? 0 : Math.round((completedTasks / tasks.length) * 100);

    return res.status(200).json({
      success: true,
      data: {
        totalProjects: projects.length,
        totalTasks: tasks.length,
        completedTasks,
        pendingTasks,
        overdueTasks,
        overallProgress,
        projects,
        tasksByStatus: {
          TODO: tasks.filter((task) => task.status === 'TODO').length,
          IN_PROGRESS: tasks.filter((task) => task.status === 'IN_PROGRESS').length,
          IN_REVIEW: tasks.filter((task) => task.status === 'IN_REVIEW').length,
          DONE: completedTasks,
        },
        tasksByPriority: {
          LOW: tasks.filter((task) => task.priority === 'LOW').length,
          MEDIUM: tasks.filter((task) => task.priority === 'MEDIUM').length,
          HIGH: tasks.filter((task) => task.priority === 'HIGH').length,
          URGENT: tasks.filter((task) => task.priority === 'URGENT').length,
        },
      },
    });
  }),
);

const activityQuerySchema = paginationQuerySchema.extend({
  projectId: idSchema.optional(),
});

activityRouter.get(
  '/',
  validate({ query: activityQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = req.valid.query;
    const pagination = parsePagination(query, { defaultLimit: 20 });
    const { rows, total } = await activityRepository.listAccessibleActivity(req.user, {
      projectId: query.projectId,
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

const calendarQuerySchema = z.object({
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
  projectId: idSchema.optional(),
});

calendarRouter.get(
  '/events',
  validate({ query: calendarQuerySchema }),
  asyncHandler(async (req, res) => {
    const { from, to, projectId } = req.valid.query;

    if (projectId) {
      const project = await projectRepository.findProjectAccess(projectId, req.user.id);
      assertProjectAccess(project, req.user);
    }

    const [projectRows, taskRows] = await Promise.all([
      projectRepository.listAllProjectsForUser(req.user),
      taskRepository.listAllTasksForUser(req.user),
    ]);

    const withinRange = (value) => {
      const date = String(value).slice(0, 10);
      if (from && date < from) return false;
      if (to && date > to) return false;
      return true;
    };

    const projectNameById = new Map(
      projectRows.map((row) => [Number(row.id), row.name]),
    );

    const events = [];

    for (const task of taskRows) {
      if (projectId && Number(task.project_id) !== projectId) continue;
      if (!task.due_date) continue;
      const date = new Date(task.due_date).toISOString().slice(0, 10);
      if (!withinRange(date)) continue;
      events.push({
        id: `task-${task.id}`,
        type: 'TASK_DUE',
        title: task.title,
        date,
        dateTime: new Date(task.due_date).toISOString(),
        projectId: Number(task.project_id),
        projectName: projectNameById.get(Number(task.project_id)) ?? null,
        status: task.status,
        priority: task.priority,
        taskId: Number(task.id),
      });
    }

    for (const project of projectRows) {
      if (projectId && Number(project.id) !== projectId) continue;
      if (!project.due_date) continue;
      const date = String(project.due_date).slice(0, 10);
      if (!withinRange(date)) continue;
      events.push({
        id: `project-${project.id}`,
        type: 'PROJECT_DUE',
        title: project.name,
        date,
        dateTime: null,
        projectId: Number(project.id),
        projectName: project.name,
        status: project.status,
        priority: null,
        taskId: null,
      });
    }

    events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    return res.status(200).json({ success: true, data: events });
  }),
);

timelineRouter.get(
  '/projects',
  asyncHandler(async (req, res) => {
    const rows = await projectRepository.listAllProjectsForUser(req.user);
    return res.status(200).json({ success: true, data: rows.map(serializeProject) });
  }),
);
