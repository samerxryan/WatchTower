import { z } from 'zod';
import {
  idSchema,
  nullableDateOnlySchema,
  paginationQuerySchema,
  PROJECT_STATUSES,
} from '../../utils/schemas.js';

export const projectParamsSchema = z.object({ projectId: idSchema });

export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Le nom du projet est requis.')
    .max(160, 'Le nom du projet ne peut pas dépasser 160 caractères.'),
  description: z.string().max(5000).nullable().optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  startDate: nullableDateOnlySchema.optional(),
  dueDate: nullableDateOnlySchema.optional(),
});

export const updateProjectSchema = createProjectSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Aucune modification valide fournie.',
  });

export const listProjectsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(PROJECT_STATUSES).optional(),
  search: z.string().trim().max(160).optional(),
  ownerId: idSchema.optional(),
  sortBy: z.enum(['name', 'status', 'startDate', 'dueDate', 'createdAt', 'updatedAt']).optional(),
});

export const addMemberSchema = z.object({
  userId: idSchema,
  projectRole: z.enum(['MANAGER', 'MEMBER']).optional(),
});

export const memberParamsSchema = z.object({
  projectId: idSchema,
  userId: idSchema,
});
