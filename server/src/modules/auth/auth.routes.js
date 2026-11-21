import express from 'express';
import { env } from '../../config/env.js';
import { withTransaction } from '../../database/pool.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { clearAuthCookies, readRefreshToken, setRefreshCookie } from '../../utils/cookies.js';
import { addMinutes, createOpaqueToken, hashToken } from '../../utils/tokens.js';
import { Errors } from '../../utils/errors.js';
import { serializeUser } from '../../utils/serializers.js';
import { validate } from '../../utils/validate.js';
import { authenticate } from '../../middleware/auth.js';
import * as userRepository from '../../repositories/userRepository.js';
import * as sessionRepository from '../../repositories/sessionRepository.js';
import * as auditRepository from '../../repositories/auditRepository.js';
import * as resetTokenRepository from '../../repositories/resetTokenRepository.js';
import {
  createSession,
  hashPassword,
  setAccessForUser,
  verifyPassword,
  verifyAccessToken,
} from '../../services/authService.js';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from './auth.schemas.js';

export const authRouter = express.Router();

authRouter.post(
  '/register',
  validate({ body: registerSchema }),
  asyncHandler(async (req, res) => {
    const { fullName, email, password } = req.valid.body;

    if (await userRepository.emailExists(email)) {
      throw Errors.conflict('Un compte existe déjà avec cette adresse email.');
    }

    const passwordHash = await hashPassword(password);
    const row = await userRepository.createUser({
      fullName,
      email,
      passwordHash,
      role: 'TEAM_MEMBER',
      preferredLanguage: 'fr',
      preferredTheme: 'light',
    });

    return res.status(201).json({
      success: true,
      data: { user: serializeUser(row) },
    });
  }),
);

authRouter.post(
  '/login',
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const { email, password } = req.valid.body;
    const user = await userRepository.findUserByEmail(email);

    if (!user || !user.is_active) {
      await auditRepository.insertAudit({ action: 'LOGIN_FAILED', details: { reason: 'invalid_credentials' } });
      throw Errors.unauthorized('Email ou mot de passe incorrect.');
    }

    const passwordValid = await verifyPassword(password, user.password_hash);
    if (!passwordValid) {
      await auditRepository.insertAudit({ action: 'LOGIN_FAILED', details: { reason: 'invalid_credentials' } });
      throw Errors.unauthorized('Email ou mot de passe incorrect.');
    }

    await auditRepository.insertAudit({ actorId: user.id, action: 'LOGIN_SUCCESS' });

    const session = await createSession(user.id, req);
    setAccessForUser(res, user);
    setRefreshCookie(res, session.token);

    return res.status(200).json({
      success: true,
      data: { user: serializeUser(user) },
    });
  }),
);

authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const refreshToken = readRefreshToken(req);
    if (!refreshToken) {
      throw Errors.unauthorized('Session expirée. Veuillez vous reconnecter.');
    }

    const tokenHash = hashToken(refreshToken);
    const session = await sessionRepository.findActiveSessionWithUser(tokenHash);
    if (!session || !session.is_active) {
      clearAuthCookies(res);
      throw Errors.unauthorized('Session expirée. Veuillez vous reconnecter.');
    }

    const user = { ...session };
    delete user.session_id;
    delete user.session_user_id;
    delete user.session_expires_at;
    const userId = session.session_user_id;

    const rotated = await withTransaction(async (connection) => {
      await sessionRepository.revokeSessionByHash(tokenHash, connection);
      return createSession(userId, req, connection);
    });

    setAccessForUser(res, user);
    setRefreshCookie(res, rotated.token);

    return res.status(200).json({
      success: true,
      data: { user: serializeUser(user) },
    });
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const refreshToken = readRefreshToken(req);
    if (refreshToken) {
      await sessionRepository.revokeSessionByHash(hashToken(refreshToken));
    }
    clearAuthCookies(res);
    return res.status(200).json({ success: true, data: { message: 'Déconnexion réussie.' } });
  }),
);

authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) =>
    res.status(200).json({
      success: true,
      data: serializeUser(req.userRow),
    }),
  ),
);

authRouter.post(
  '/forgot-password',
  validate({ body: forgotPasswordSchema }),
  asyncHandler(async (req, res) => {
    const { email } = req.valid.body;
    const user = await userRepository.findUserByEmail(email);
    const genericPayload = {
      message:
        'Si un compte correspond à cette adresse, un jeton de réinitialisation a été généré.',
    };

    if (!user || !user.is_active) {
      return res.status(200).json({ success: true, data: genericPayload });
    }

    const token = createOpaqueToken(32);
    const tokenHash = hashToken(token);
    const expiresAt = addMinutes(new Date(), env.security.resetTokenMinutes);

    await withTransaction(async (connection) => {
      // Serialize concurrent forgot-password requests for the same account.
      await userRepository.lockUserForUpdate(user.id, connection);
      await resetTokenRepository.invalidateActiveTokensForUser(user.id, connection);
      await resetTokenRepository.createResetToken({ userId: user.id, tokenHash, expiresAt }, connection);
      await auditRepository.insertAudit(
        { actorId: user.id, action: 'PASSWORD_RESET_REQUESTED' },
        connection,
      );
    });

    if (env.security.exposeResetToken) {
      console.info(
        `[WatchTower] Password reset token generated for user #${user.id} (valid ${env.security.resetTokenMinutes} min): ${token}`,
      );
      return res.status(200).json({
        success: true,
        data: { ...genericPayload, resetToken: token, expiresInMinutes: env.security.resetTokenMinutes },
      });
    }

    return res.status(200).json({ success: true, data: genericPayload });
  }),
);

authRouter.post(
  '/reset-password',
  validate({ body: resetPasswordSchema }),
  asyncHandler(async (req, res) => {
    const { token, newPassword } = req.valid.body;
    const tokenHash = hashToken(token);
    const record = await resetTokenRepository.findActiveResetToken(tokenHash);

    if (!record || !record.is_active) {
      throw Errors.badRequest(
        'INVALID_RESET_TOKEN',
        'Jeton de réinitialisation invalide ou expiré.',
      );
    }

    const passwordHash = await hashPassword(newPassword);

    await withTransaction(async (connection) => {
      await userRepository.updatePassword(record.user_id, passwordHash, connection);
      await resetTokenRepository.markResetTokenUsed(record.id, connection);
      await resetTokenRepository.invalidateActiveTokensForUser(record.user_id, connection);
      await sessionRepository.revokeAllSessionsForUser(record.user_id, {}, connection);
      await auditRepository.insertAudit(
        { actorId: record.user_id, action: 'PASSWORD_RESET_COMPLETED' },
        connection,
      );
    });

    clearAuthCookies(res);
    return res.status(200).json({
      success: true,
      data: { message: 'Mot de passe réinitialisé. Vous pouvez vous connecter.' },
    });
  }),
);

// Kept for completeness: validates an access token without relying on middleware.
authRouter.get(
  '/verify',
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[env.cookies.accessName];
    if (!token) throw Errors.unauthorized('Authentification requise.');
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw Errors.unauthorized('Jeton invalide ou expiré.');
    }
    const user = await userRepository.findUserById(Number(payload.sub));
    if (!user || !user.is_active) {
      throw Errors.unauthorized('Jeton invalide ou expiré.');
    }
    return res.status(200).json({ success: true, data: { valid: true } });
  }),
);
