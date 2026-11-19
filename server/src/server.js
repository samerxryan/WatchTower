import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { env } from './config/env.js';
import { attachErrorHandlers, createApp } from './app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

async function startServer() {
  const app = createApp();

  if (!env.isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
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
    }
  }

  attachErrorHandlers(app);

  app.listen(env.port, '0.0.0.0', () => {
    console.log(`WatchTower server listening on http://0.0.0.0:${env.port} (${env.nodeEnv})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start WatchTower server:', err);
  process.exit(1);
});
