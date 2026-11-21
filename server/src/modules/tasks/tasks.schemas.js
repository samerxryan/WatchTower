import { z } from 'zod';
import {
  idSchema,
  nullableDateTimeSchema,
  paginationQuerySchema,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from '../../utils/schemas.js';

export const projectTaskParamsSchema = z.object({ projectId: idSchema });
export const taskParamsSchema = z.object({ taskId: idSchema });
export const commentParamsSchema = z.object({ commentId: idSchema });

export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Le titre de la tâche est requis.')
    .max(180, 'Le titre ne peut pas dépasser 180 caractères.'),
  description: z.string().max(10000).nullable().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  assigneeId: z.union([idSchema, z.null()]).optional(),
  dueDate: nullableDateTimeSchema.optional(),
});

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(180).optional(),
    description: z.string().max(10000).nullable().optional(),
    status: z.enum(TASK_STATUSES).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    assigneeId: z.union([idSchema, z.null()]).optional(),
    dueDate: nullableDateTimeSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Aucune modification valide fournie.',
  });

export const updateTaskStatusSchema = z.object({
  status: z.enum(TASK_STATUSES),
});

export const listTasksQuerySchema = paginationQuerySchema.extend({
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  assigneeId: idSchema.optional(),
  projectId: idSchema.optional(),
  search: z.string().trim().max(180).optional(),
  sortBy: z.enum(['title', 'status', 'priority', 'dueDate', 'createdAt', 'updatedAt']).optional(),
});

export const commentBodySchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Le commentaire ne peut pas être vide.')
    .max(5000, 'Le commentaire ne peut pas dépasser 5000 caractères.'),
});
