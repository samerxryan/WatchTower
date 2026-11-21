import crypto from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

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

function parsePositiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseJwtExpiresIn(value) {
  const configured = value || '15m';
  if (/^\d+(s|m|h|d)$/.test(configured) || /^\d+$/.test(configured)) {
    return configured;
  }
  if (isProduction) {
    throw new Error('JWT_EXPIRES_IN must be a duration such as 15m, 1h or 900.');
  }
  return '15m';
}

// Express only honours X-Forwarded-* headers when explicitly told to trust a
// proxy. Defaulting to false prevents clients from spoofing req.ip and
// bypassing the login/reset rate limits.
function parseTrustProxy(value) {
  const raw = String(value || '').trim();
  if (!raw || raw === '0' || raw === 'false') return false;
  if (raw === 'true') return true;
  if (/^\d+$/.test(raw)) return Number(raw);
  return raw;
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
    expiresIn: parseJwtExpiresIn(process.env.JWT_EXPIRES_IN),
    refreshDays: parsePositiveInt(process.env.JWT_REFRESH_DAYS, 7),
    cookieSecure: process.env.COOKIE_SECURE === 'true' || isProduction,
  },
  cookies: {
    accessName: 'wt_access',
    refreshName: 'wt_refresh',
    sameSite: 'lax',
  },
  security: {
    bcryptRounds: parsePositiveInt(process.env.BCRYPT_ROUNDS, 12),
    // Local development helper: expose the reset token so the UI flow can be tested
    // without an email provider. Never enabled in production.
    exposeResetToken: !isProduction && process.env.EXPOSE_RESET_TOKEN !== 'false',
    resetTokenMinutes: parsePositiveInt(process.env.RESET_TOKEN_MINUTES, 30),
    trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
    // Limiters stay active in production/development. Tests opt in explicitly so
    // 429 behaviour can be verified without affecting the rest of the suite.
    rateLimiting: !isTest || process.env.RATE_LIMIT_ENABLED === 'true',
  },
};
