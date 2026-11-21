import { z } from 'zod';
import {
  emailSchema,
  fullNameSchema,
  passwordSchema,
} from '../../utils/schemas.js';

export const registerSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Le mot de passe est requis.').max(128),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(10, 'Jeton invalide.').max(255),
  newPassword: passwordSchema,
});
