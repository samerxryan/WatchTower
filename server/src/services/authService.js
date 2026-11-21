import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Errors } from '../utils/errors.js';
import { addDays, createOpaqueToken, hashToken } from '../utils/tokens.js';
import { setAccessCookie } from '../utils/cookies.js';
import * as sessionRepository from '../repositories/sessionRepository.js';
import * as userRepository from '../repositories/userRepository.js';

const JWT_ISSUER = 'watchtower';
const JWT_AUDIENCE = 'watchtower-web';

export function hashPassword(password) {
  return bcrypt.hash(password, env.security.bcryptRounds);
}

export function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export function signAccessToken(user) {
  return jwt.sign(
    { role: user.role, typ: 'access' },
    env.jwt.secret,
    {
      subject: String(user.id),
      expiresIn: env.jwt.expiresIn,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithm: 'HS256',
    },
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.secret, {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    algorithms: ['HS256'],
  });
}

export async function createSession(userId, req, connection = null) {
  const token = createOpaqueToken();
  const tokenHash = hashToken(token);
  const expiresAt = addDays(new Date(), env.jwt.refreshDays);
  const userAgent = String(req.get('user-agent') || '').slice(0, 255) || null;
  const ipAddress = String(req.ip || '').slice(0, 64) || null;

  const sessionId = await sessionRepository.createSession(
    { userId, tokenHash, expiresAt, userAgent, ipAddress },
    connection,
  );

  return { token, tokenHash, expiresAt, sessionId };
}

export function setAccessForUser(res, user) {
  const accessToken = signAccessToken(user);
  setAccessCookie(res, accessToken);
  return accessToken;
}

/**
 * Resolve the authenticated user from the HttpOnly access cookie, falling back
 * to the long-lived refresh session so a 15-minute access token never interrupts
 * an active browser session. The refresh token is not rotated here to avoid
 * races between concurrent frontend requests.
 */
export async function resolveAuthenticatedUser(req, res) {
  const accessToken = req.cookies?.[env.cookies.accessName];
  if (accessToken) {
    try {
      const payload = verifyAccessToken(accessToken);
      const user = await userRepository.findUserById(Number(payload.sub));
      if (!user || !user.is_active) {
        throw Errors.unauthorized('Session expirée. Veuillez vous reconnecter.');
      }
      return { user, sessionId: null, refreshed: false };
    } catch {
      // Expired or tampered access token: try the refresh session below.
    }
  }

  const refreshToken = req.cookies?.[env.cookies.refreshName];
  if (!refreshToken) {
    return null;
  }

  const session = await sessionRepository.findActiveSessionWithUser(hashToken(refreshToken));
  if (!session || !session.is_active) {
    return null;
  }

  const user = { ...session };
  delete user.session_id;
  delete user.session_user_id;
  delete user.session_expires_at;

  await sessionRepository.touchSession(session.session_id);
  setAccessForUser(res, user);

  return { user, sessionId: session.session_id, refreshed: true };
}
