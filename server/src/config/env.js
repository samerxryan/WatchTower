import crypto from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const isTest = nodeEnv === 'test';

function resolveJwtSecret() {
  const configured = process.env.JWT_SECRET;
  if (configured && configured.length >= 32 && !configured.startsWith('CHANGE_ME')) {
    return configured;
  }
  if (isProduction) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters in production.');
  }
  // Ephemeral CSPRNG secret for local/test runs when JWT_SECRET is not provided in .env
  return crypto.randomBytes(32).toString('hex');
}

export const env = {
  nodeEnv,
  isProduction,
  isTest,
  port: Number(process.env.PORT || 3000),
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  corsOrigins: (process.env.CORS_ORIGIN || process.env.APP_URL || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    database: isTest
      ? (process.env.TEST_DB_NAME || 'watchtower_test')
      : (process.env.DB_NAME || 'watchtower_db'),
  },
  jwt: {
    secret: resolveJwtSecret(),
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    cookieSecure: process.env.COOKIE_SECURE === 'true' || isProduction,
  },
};
