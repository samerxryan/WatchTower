import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { env } from './config/env.js';
import { attachErrorHandlers, createApp } from './app.js';
import { checkDatabaseHealth, closePool } from './database/pool.js';
import * as sessionRepository from './repositories/sessionRepository.js';
import { runDeadlineSweep, startDeadlineScheduler } from './services/deadlineService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

async function startServer() {
  const app = createApp();
  let vite = null;

  if (!env.isProduction) {
    const { createServer: createViteServer } = await import('vite');
    vite = await createViteServer({
      root: path.join(rootDir, 'client'),
      configFile: path.join(rootDir, 'vite.config.js'),
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR ? false : undefined,
      },
      appType: 'spa',
    });

    app.use((req, res, next) => {
      if (req.originalUrl.startsWith('/api')) {
        return next();
      }
      return vite.middlewares(req, res, next);
    });
  } else {
    const clientDist = path.join(rootDir, 'dist/client');
    if (fs.existsSync(clientDist)) {
      app.use(express.static(clientDist));
      app.get(/^(?!\/api).*/, (_req, res) => {
        res.sendFile(path.join(clientDist, 'index.html'));
      });
    } else {
      console.warn('[WatchTower] dist/client is missing. Run `npm run build` before `npm start`.');
    }
  }

  attachErrorHandlers(app);

  const server = http.createServer(app);
  server.listen(env.port, '0.0.0.0', () => {
    console.log(`WatchTower server listening on http://0.0.0.0:${env.port} (${env.nodeEnv})`);
  });

  // Startup housekeeping never blocks the HTTP listener. Health is reported so
  // a misconfigured database is obvious without leaking connection details.
  const health = await checkDatabaseHealth();
  if (!health.connected) {
    console.warn(`[WatchTower] Database is not connected (${health.reason || 'unconfigured'}).`);
  } else if (!env.isTest) {
    runDeadlineSweep()
      .then((result) => {
        console.log(
          `[WatchTower] Deadline sweep checked ${result.usersChecked} active account(s).`,
        );
      })
      .catch((err) => {
        console.error('[WatchTower] Initial deadline sweep failed:', err?.message || 'Unknown error');
      });
    sessionRepository.deleteExpiredSessions().catch((err) => {
      console.error('[WatchTower] Session cleanup failed:', err?.message || 'Unknown error');
    });
  }

  const stopScheduler = env.isTest ? () => {} : startDeadlineScheduler();

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[WatchTower] Received ${signal}, shutting down gracefully...`);

    stopScheduler();

    const forceExit = setTimeout(() => {
      console.error('[WatchTower] Forced shutdown after timeout.');
      process.exit(1);
    }, 10_000);
    forceExit.unref();

    server.close(async () => {
      try {
        if (vite) await vite.close();
        await closePool();
        clearTimeout(forceExit);
        console.log('[WatchTower] Shutdown complete.');
        process.exit(0);
      } catch (err) {
        console.error('[WatchTower] Shutdown error:', err?.message || 'Unknown error');
        process.exit(1);
      }
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return server;
}

startServer().catch((err) => {
  console.error('Failed to start WatchTower server:', err);
  process.exit(1);
});
