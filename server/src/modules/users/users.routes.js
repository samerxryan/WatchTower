import express from 'express';
import { withTransaction } from '../../database/pool.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { setAccessCookie, setRefreshCookie } from '../../utils/cookies.js';
import { Errors } from '../../utils/errors.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';
import { serializePreferences, serializePublicUser, serializeUser } from '../../utils/serializers.js';
import { validate } from '../../utils/validate.js';
import { authenticate, requireRoles } from '../../middleware/auth.js';
import * as userRepository from '../../repositories/userRepository.js';
import * as sessionRepository from '../../repositories/sessionRepository.js';
import * as auditRepository from '../../repositories/auditRepository.js';
import { createSession, hashPassword, signAccessToken, verifyPassword } from '../../services/authService.js';
import {
  listUsersQuerySchema,
  preferencesSchema,
  updateMeSchema,
  updatePasswordSchema,
  updateRoleSchema,
  updateStatusSchema,
  userParamsSchema,
} from './users.schemas.js';

export const usersRouter = express.Router();

usersRouter.use(authenticate);

usersRouter.get(
  '/me',
  asyncHandler(async (req, res) =>
    res.status(200).json({ success: true, data: serializeUser(req.userRow) }),
  ),
);

usersRouter.patch(
  '/me',
  validate({ body: updateMeSchema }),
  asyncHandler(async (req, res) => {
    const { fullName, avatarUrl } = req.valid.body;
    const row = await userRepository.updateProfile(req.user.id, {
      ...(fullName !== undefined ? { fullName } : {}),
      ...(avatarUrl !== undefined ? { avatarUrl } : {}),
    });
    return res.status(200).json({ success: true, data: serializeUser(row) });
  }),
);

usersRouter.patch(
  '/me/password',
  validate({ body: updatePasswordSchema }),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.valid.body;
    const current = await userRepository.findUserById(req.user.id);

    if (!current || !(await verifyPassword(currentPassword, current.password_hash))) {
      throw Errors.badRequest('INVALID_PASSWORD', 'Le mot de passe actuel est incorrect.');
    }

    const passwordHash = await hashPassword(newPassword);

    const newSession = await withTransaction(async (connection) => {
      await userRepository.updatePassword(req.user.id, passwordHash, connection);
      // Password change revokes every existing device, then issues a single
      // fresh session for the device performing the change.
      await sessionRepository.revokeAllSessionsForUser(req.user.id, {}, connection);
      await auditRepository.insertAudit(
        { actorId: req.user.id, action: 'PASSWORD_CHANGED' },
        connection,
      );
      return createSession(req.user.id, req, connection);
    });

    setAccessCookie(res, signAccessToken(req.userRow));
    setRefreshCookie(res, newSession.token);

    return res.status(200).json({
      success: true,
      data: { message: 'Mot de passe mis à jour.' },
    });
  }),
);

usersRouter.get(
  '/me/preferences',
  asyncHandler(async (req, res) =>
    res.status(200).json({
      success: true,
      data: {
        preferredLanguage: req.user.preferredLanguage,
        preferredTheme: req.user.preferredTheme,
        notificationPrefs: req.user.notificationPrefs,
      },
    }),
  ),
);

usersRouter.patch(
  '/me/preferences',
  validate({ body: preferencesSchema }),
  asyncHandler(async (req, res) => {
    const { preferredLanguage, preferredTheme, notificationPrefs } = req.valid.body;
    const mergedPrefs =
      notificationPrefs !== undefined
        ? { ...serializePreferences(req.userRow), ...notificationPrefs }
        : undefined;

    const row = await userRepository.updatePreferences(req.user.id, {
      ...(preferredLanguage !== undefined ? { preferredLanguage } : {}),
      ...(preferredTheme !== undefined ? { preferredTheme } : {}),
      ...(mergedPrefs !== undefined ? { notificationPrefs: mergedPrefs } : {}),
    });

    return res.status(200).json({ success: true, data: serializeUser(row) });
  }),
);

usersRouter.get(
  '/',
  requireRoles('ADMIN', 'PROJECT_MANAGER'),
  validate({ query: listUsersQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = req.valid.query;
    const pagination = parsePagination(query);
    const { rows, total } = await userRepository.listUsers({
      search: query.search,
      role: query.role,
      isActive: query.isActive,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      limit: pagination.limit,
      offset: pagination.offset,
    });

    const isAdmin = req.user.role === 'ADMIN';
    const data = rows.map((row) =>
      isAdmin ? serializeUser(row) : serializePublicUser(row),
    );

    return res.status(200).json({
      success: true,
      data,
      meta: paginationMeta(total, pagination.page, pagination.limit),
    });
  }),
);

usersRouter.get(
  '/:id',
  validate({ params: userParamsSchema }),
  asyncHandler(async (req, res) => {
    const targetId = req.valid.params.id;
    const canViewAny = req.user.role === 'ADMIN' || req.user.role === 'PROJECT_MANAGER';
    if (!canViewAny && targetId !== req.user.id) {
      throw Errors.forbidden("Vous ne pouvez consulter que votre propre profil.");
    }

    const row = await userRepository.findUserById(targetId);
    if (!row) {
      throw Errors.notFound('Utilisateur introuvable.');
    }

    return res.status(200).json({
      success: true,
      data: req.user.role === 'ADMIN' ? serializeUser(row) : serializePublicUser(row),
    });
  }),
);

usersRouter.patch(
  '/:id/role',
  requireRoles('ADMIN'),
  validate({ params: userParamsSchema, body: updateRoleSchema }),
  asyncHandler(async (req, res) => {
    const targetId = req.valid.params.id;
    const { role } = req.valid.body;
    const target = await userRepository.findUserById(targetId);
    if (!target) {
      throw Errors.notFound('Utilisateur introuvable.');
    }

    const losingAdmin =
      target.role === 'ADMIN' && Boolean(target.is_active) && role !== 'ADMIN';
    if (losingAdmin) {
      const remainingAdmins = await userRepository.countActiveAdmins(null, targetId);
      if (remainingAdmins === 0) {
        throw Errors.conflict('Impossible de retirer le dernier administrateur actif.');
      }
    }

    const row = await withTransaction(async (connection) => {
      const updated = await userRepository.updateRole(targetId, role, connection);
      await auditRepository.insertAudit(
        {
          actorId: req.user.id,
          action: 'ROLE_CHANGED',
          details: { userId: targetId, previousRole: target.role, nextRole: role },
        },
        connection,
      );
      return updated;
    });
    return res.status(200).json({ success: true, data: serializeUser(row) });
  }),
);

usersRouter.patch(
  '/:id/status',
  requireRoles('ADMIN'),
  validate({ params: userParamsSchema, body: updateStatusSchema }),
  asyncHandler(async (req, res) => {
    const targetId = req.valid.params.id;
    const { isActive } = req.valid.body;

    if (targetId === req.user.id && !isActive) {
      throw Errors.badRequest('SELF_DEACTIVATION', 'Vous ne pouvez pas désactiver votre propre compte.');
    }

    const target = await userRepository.findUserById(targetId);
    if (!target) {
      throw Errors.notFound('Utilisateur introuvable.');
    }

    if (!isActive && target.role === 'ADMIN') {
      const remainingAdmins = await userRepository.countActiveAdmins(null, targetId);
      if (remainingAdmins === 0) {
        throw Errors.conflict('Impossible de désactiver le dernier administrateur actif.');
      }
    }

    const row = await withTransaction(async (connection) => {
      const updated = await userRepository.updateStatus(targetId, isActive, connection);
      if (!isActive) {
        await sessionRepository.revokeAllSessionsForUser(targetId, {}, connection);
      }
      await auditRepository.insertAudit(
        {
          actorId: req.user.id,
          action: 'USER_STATUS_CHANGED',
          details: { userId: targetId, isActive },
        },
        connection,
      );
      return updated;
    });

    return res.status(200).json({ success: true, data: serializeUser(row) });
  }),
);
