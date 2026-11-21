import request from 'supertest';
import { attachErrorHandlers, createApp } from '../src/app.js';
import { runMigrations } from '../src/database/migrate.js';
import { getPool } from '../src/database/pool.js';
import * as userRepository from '../src/repositories/userRepository.js';
import { hashPassword } from '../src/services/authService.js';

const DATA_TABLES = [
  'audit_logs',
  'activity_logs',
  'notifications',
  'comments',
  'tasks',
  'project_members',
  'projects',
  'user_sessions',
  'password_reset_tokens',
  'users',
];

let migrationsApplied = false;

export async function prepareDatabase() {
  if (!migrationsApplied) {
    await runMigrations();
    migrationsApplied = true;
  }
  await resetData();
}

export async function resetData() {
  // FOREIGN_KEY_CHECKS is per connection: run the whole reset on one dedicated
  // connection so a pooled connection is never left with checks disabled.
  const connection = await getPool().getConnection();
  try {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of DATA_TABLES) {
      await connection.query(`TRUNCATE TABLE ${table}`);
    }
  } finally {
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    connection.release();
  }
}

export function buildApp(options = {}) {
  const app = createApp(options);
  attachErrorHandlers(app);
  return app;
}

export async function createUser({
  fullName,
  email,
  password = 'Password123!',
  role = 'TEAM_MEMBER',
  preferredLanguage = 'fr',
  preferredTheme = 'light',
}) {
  const passwordHash = await hashPassword(password);
  return userRepository.createUser({
    fullName,
    email,
    passwordHash,
    role,
    preferredLanguage,
    preferredTheme,
  });
}

export async function login(app, email, password = 'Password123!') {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password });
  if (response.status !== 200) {
    throw new Error(`Login failed for ${email}: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return response;
}

export async function loginAgent(app, email, password = 'Password123!') {
  const agent = request.agent(app);
  const response = await agent.post('/api/v1/auth/login').send({ email, password });
  if (response.status !== 200) {
    throw new Error(
      `Login failed for ${email}: ${response.status} ${JSON.stringify(response.body)}`,
    );
  }
  return agent;
}

export function cookieFrom(response, name) {
  const cookies = response.headers['set-cookie'] || [];
  const match = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  return match ? match.split(';')[0] : null;
}
