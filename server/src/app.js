import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { checkDatabaseHealth } from './database/pool.js';
import { apiNotFoundHandler } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import { verifyRequestOrigin } from './middleware/auth.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { projectsRouter } from './modules/projects/projects.routes.js';
import {
  commentsRouter,
  projectTasksRouter,
  tasksRouter,
} from './modules/tasks/tasks.routes.js';
import { notificationsRouter } from './modules/notifications/notifications.routes.js';
import {
  activityRouter,
  calendarRouter,
  reportsRouter,
  timelineRouter,
} from './modules/insights/insights.routes.js';

function rateLimiter({ windowMs, limit, code, message, enabled }) {
  return rateLimit({
    windowMs,
    limit: enabled ? limit : 10_000,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code,
        message,
        details: [],
      },
    },
  });
}

export function createApp({ rateLimiting = env.security.rateLimiting } = {}) {
  const app = express();

  // X-Forwarded-* headers are only honoured when a trusted proxy is configured.
  app.set('trust proxy', env.security.trustProxy);

  app.use(
    helmet({
      contentSecurityPolicy: env.isProduction ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.corsOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
    }),
  );

  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(verifyRequestOrigin);

  const authLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    code: 'TOO_MANY_REQUESTS',
    message: 'Trop de tentatives. Veuillez réessayer dans quelques minutes.',
    enabled: rateLimiting,
  });

  const loginLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    code: 'TOO_MANY_LOGIN_ATTEMPTS',
    message: 'Trop de tentatives de connexion. Veuillez réessayer plus tard.',
    enabled: rateLimiting,
  });

  const passwordResetLimiter = rateLimiter({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    code: 'TOO_MANY_RESET_REQUESTS',
    message: 'Trop de demandes de réinitialisation. Veuillez réessayer plus tard.',
    enabled: rateLimiting,
  });

  app.use('/api/v1/auth', authLimiter);
  app.use('/api/v1/auth/login', loginLimiter);
  app.use('/api/v1/auth/forgot-password', passwordResetLimiter);

  const apiV1 = express.Router();

  apiV1.get('/health', async (_req, res) => {
    const dbHealth = await checkDatabaseHealth();
    const isHealthy = dbHealth.connected;

    // Public readiness probe: expose only service state, never DB name or
    // connection error codes.
    return res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      data: {
        service: 'WatchTower API',
        status: isHealthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        database: { connected: isHealthy },
      },
    });
  });

  apiV1.use('/auth', authRouter);
  apiV1.use('/users', usersRouter);
  apiV1.use('/projects', projectsRouter);
  apiV1.use('/projects/:projectId/tasks', projectTasksRouter);
  apiV1.use('/tasks', tasksRouter);
  apiV1.use('/comments', commentsRouter);
  apiV1.use('/notifications', notificationsRouter);
  apiV1.use('/reports', reportsRouter);
  apiV1.use('/activity', activityRouter);
  apiV1.use('/calendar', calendarRouter);
  apiV1.use('/timeline', timelineRouter);

  app.use('/api/v1', apiV1);
  app.use('/api/v1', apiNotFoundHandler);
  app.use('/api', apiNotFoundHandler);

  return app;
}

export function attachErrorHandlers(app) {
  app.use(errorHandler);
  return app;
}
