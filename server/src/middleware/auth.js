import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { clearAuthCookies } from '../utils/cookies.js';
import { Errors } from '../utils/errors.js';
import { serializeUser } from '../utils/serializers.js';
import { resolveAuthenticatedUser } from '../services/authService.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  const result = await resolveAuthenticatedUser(req, res);
  if (!result) {
    clearAuthCookies(res);
    throw Errors.unauthorized('Authentification requise.');
  }

  req.userRow = result.user;
  req.user = serializeUser(result.user);
  req.sessionId = result.sessionId;
  next();
});

export function requireRoles(...roles) {
  return function roleMiddleware(req, _res, next) {
    if (!req.user) {
      return next(Errors.unauthorized('Authentification requise.'));
    }
    if (!roles.includes(req.user.role)) {
      return next(Errors.forbidden("Votre rôle ne permet pas d'effectuer cette action."));
    }
    return next();
  };
}

/**
 * Lightweight CSRF guard for cookie-based authentication. Browsers always send
 * an Origin header on cross-site state-changing requests. Requests without an
 * Origin header (curl, server-to-server, integration tests) are allowed.
 */
export function verifyRequestOrigin(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const origin = req.get('origin');
  if (!origin || env.corsOrigins.includes(origin)) {
    return next();
  }

  return next(Errors.forbidden("Origine de requête non autorisée."));
}
