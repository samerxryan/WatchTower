import { z } from 'zod';
import { isDateOnly } from './dates.js';

export const ROLES = ['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER'];
export const PROJECT_STATUSES = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'];
export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
export const LANGUAGES = ['fr', 'en'];
export const THEMES = ['light', 'dark'];

export const idSchema = z.coerce.number().int().positive();

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(255)
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Adresse email invalide.');

export const passwordSchema = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères.')
  .max(128, 'Le mot de passe ne peut pas dépasser 128 caractères.');

export const fullNameSchema = z
  .string()
  .trim()
  .min(2, 'Le nom complet doit contenir au moins 2 caractères.')
  .max(120, 'Le nom complet ne peut pas dépasser 120 caractères.');

export const dateOnlySchema = z
  .string()
  .refine(isDateOnly, 'La date doit respecter le format AAAA-MM-JJ.');

export const nullableDateOnlySchema = z.union([dateOnlySchema, z.null()]);

export const dateTimeSchema = z.string().refine((value) => {
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && /\d{4}-\d{2}-\d{2}T/.test(value);
}, "La date et l'heure doivent respecter le format ISO 8601.");

export const nullableDateTimeSchema = z.union([dateTimeSchema, z.null()]);

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sortBy: z.string().max(40).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const booleanQuerySchema = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

export const notificationPrefsSchema = z.object({
  assigned: z.boolean().optional(),
  dueSoon: z.boolean().optional(),
  statusChange: z.boolean().optional(),
});

export function enumSchema(values, message) {
  return z.enum(values, { message });
}
