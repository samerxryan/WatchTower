import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { checkDatabaseHealth } from './database/pool.js';
import { apiNotFoundHandler } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

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

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Trop de tentatives. Veuillez réessayer dans quelques minutes.',
        details: [],
      },
    },
  });

  app.use('/api/v1/auth', authLimiter);

  const apiV1 = express.Router();

  apiV1.get('/health', async (_req, res) => {
    const dbHealth = await checkDatabaseHealth();
    const isHealthy = dbHealth.connected;

    return res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      data: {
        service: 'WatchTower API',
        status: isHealthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        database: dbHealth,
      },
    });
  });

  app.use('/api/v1', apiV1);
  app.use('/api/v1', apiNotFoundHandler);
  app.use('/api', apiNotFoundHandler);

  return app;
}

export function attachErrorHandlers(app) {
  app.use(errorHandler);
  return app;
}
