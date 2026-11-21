import { z } from 'zod';
import {
  booleanQuerySchema,
  fullNameSchema,
  idSchema,
  LANGUAGES,
  notificationPrefsSchema,
  paginationQuerySchema,
  passwordSchema,
  ROLES,
  THEMES,
} from '../../utils/schemas.js';

export const userParamsSchema = z.object({ id: idSchema });

// Accept absolute http(s) URLs or local relative paths; avoid javascript: and
// data: URLs that could become an XSS vector when rendered in an <img>.
const avatarUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine((value) => value === '' || /^https?:\/\/\S+/i.test(value) || /^\/[^\s]*$/.test(value), {
    message: 'URL d\'avatar invalide.',
  })
  .nullable()
  .optional()
  .transform((value) => (value === '' || value === null ? null : value));

export const updateMeSchema = z
  .object({
    fullName: fullNameSchema.optional(),
    avatarUrl: avatarUrlSchema,
  })
  .refine((data) => data.fullName !== undefined || data.avatarUrl !== undefined, {
    message: 'Aucune modification valide fournie.',
  });

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Le mot de passe actuel est requis.').max(128),
  newPassword: passwordSchema,
});

export const preferencesSchema = z
  .object({
    preferredLanguage: z.enum(LANGUAGES).optional(),
    preferredTheme: z.enum(THEMES).optional(),
    notificationPrefs: notificationPrefsSchema.optional(),
  })
  .refine(
    (data) =>
      data.preferredLanguage !== undefined ||
      data.preferredTheme !== undefined ||
      data.notificationPrefs !== undefined,
    { message: 'Aucune préférence valide fournie.' },
  );

export const listUsersQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  role: z.enum(ROLES).optional(),
  isActive: booleanQuerySchema.optional(),
  sortBy: z.enum(['fullName', 'email', 'role', 'createdAt', 'updatedAt']).optional(),
});

export const updateRoleSchema = z.object({
  role: z.enum(ROLES),
});

export const updateStatusSchema = z.object({
  isActive: z.boolean(),
});
