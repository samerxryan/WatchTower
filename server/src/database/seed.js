import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { closePool, withTransaction } from './pool.js';

const DEMO_USERS = [
  {
    fullName: 'Claire Moreau',
    email: 'admin@watchtower.local',
    role: 'ADMIN',
    passwordEnv: 'SEED_ADMIN_PASSWORD',
    preferredLanguage: 'fr',
    preferredTheme: 'dark',
  },
  {
    fullName: 'Lucas Bernard',
    email: 'manager@watchtower.local',
    role: 'PROJECT_MANAGER',
    passwordEnv: 'SEED_MANAGER_PASSWORD',
    preferredLanguage: 'fr',
    preferredTheme: 'light',
  },
  {
    fullName: 'Sarah Jenkins',
    email: 'member@watchtower.local',
    role: 'TEAM_MEMBER',
    passwordEnv: 'SEED_MEMBER_PASSWORD',
    preferredLanguage: 'en',
    preferredTheme: 'light',
  },
];

const DEFAULT_NOTIFICATION_PREFS = JSON.stringify({
  assigned: true,
  dueSoon: true,
  statusChange: true,
});

export async function runSeed() {
  if (env.isProduction) {
    throw new Error('Seed script is forbidden in production.');
  }

  // Each demo actor gets its own password. SEED_DEMO_PASSWORD remains a
  // fallback so existing local setups keep working, but distinct values are
  // preferred so role switches are easy to demonstrate safely.
  const fallbackPassword = process.env.SEED_DEMO_PASSWORD;
  const passwordHashes = new Map();
  for (const user of DEMO_USERS) {
    const password = process.env[user.passwordEnv] || fallbackPassword;
    if (!password || password.length < 8) {
      throw new Error(
        `${user.passwordEnv} (or SEED_DEMO_PASSWORD) must be set to at least 8 characters before running the seed.`,
      );
    }
    passwordHashes.set(user.email, await bcrypt.hash(password, env.security.bcryptRounds));
  }

  await withTransaction(async (conn) => {
    for (const user of DEMO_USERS) {
      await conn.execute(
        `INSERT INTO users
           (full_name, email, password_hash, role, preferred_language, preferred_theme, notification_prefs)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           full_name = VALUES(full_name),
           password_hash = VALUES(password_hash),
           role = VALUES(role),
           preferred_language = VALUES(preferred_language),
           preferred_theme = VALUES(preferred_theme),
           notification_prefs = VALUES(notification_prefs)`,
        [
          user.fullName,
          user.email,
          passwordHashes.get(user.email),
          user.role,
          user.preferredLanguage,
          user.preferredTheme,
          DEFAULT_NOTIFICATION_PREFS,
        ],
      );
    }

    const [users] = await conn.execute('SELECT id, email FROM users WHERE email IN (?, ?, ?)', [
      'admin@watchtower.local',
      'manager@watchtower.local',
      'member@watchtower.local',
    ]);
    const userByEmail = new Map(users.map((u) => [u.email, u.id]));
    const managerId = userByEmail.get('manager@watchtower.local');
    const memberId = userByEmail.get('member@watchtower.local');

    if (!managerId || !memberId) {
      return;
    }

    const [existingProjects] = await conn.execute(
      'SELECT id FROM projects WHERE name = ? LIMIT 1',
      ['WatchTower Platform v1.0'],
    );

    if (existingProjects.length === 0) {
      const [projResult] = await conn.execute(
        `INSERT INTO projects (name, description, status, start_date, due_date, owner_id)
         VALUES (?, ?, 'ACTIVE', DATE_SUB(CURDATE(), INTERVAL 10 DAY), DATE_ADD(CURDATE(), INTERVAL 25 DAY), ?)`,
        [
          'WatchTower Platform v1.0',
          'Core sprint delivery for project management, Kanban workflow, and RBAC security.',
          managerId,
        ],
      );
      const projectId = projResult.insertId;

      await conn.execute(
        `INSERT IGNORE INTO project_members (project_id, user_id, project_role)
         VALUES (?, ?, 'MANAGER'), (?, ?, 'MEMBER')`,
        [projectId, managerId, projectId, memberId],
      );

      await conn.execute(
        `INSERT INTO tasks
           (project_id, title, description, status, priority, assignee_id, created_by, due_date, completed_at)
         VALUES
           (?, 'Configure JWT & RBAC guards', 'Enforce server-side role and membership checks on all endpoints.', 'DONE', 'URGENT', ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 2 DAY), UTC_TIMESTAMP()),
           (?, 'Implement Kanban status transitions', 'Allow authorized team members to move tasks across columns.', 'IN_PROGRESS', 'HIGH', ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 5 DAY), NULL),
           (?, 'Build bilingual FR/EN settings panel', 'Persist user language and theme preferences in MySQL.', 'TODO', 'MEDIUM', ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 9 DAY), NULL)`,
        [
          projectId, managerId, managerId,
          projectId, memberId, managerId,
          projectId, memberId, managerId,
        ],
      );

      await conn.execute(
        `INSERT INTO activity_logs (actor_id, project_id, action, description)
         VALUES (?, ?, 'PROJECT_CREATED', 'Initialized WatchTower Platform v1.0 workspace')`,
        [managerId, projectId],
      );

      await conn.execute(
        `INSERT IGNORE INTO notifications
           (user_id, type, title, message, payload, related_entity_type, related_entity_id, dedup_key)
         VALUES
           (?, 'PROJECT_INVITE', 'Added to project', ?, ?, 'project', ?, 'seed_project_invite'),
           (?, 'TASK_ASSIGNED', 'Task assigned', ?, ?, 'task', NULL, 'seed_task_assigned')`,
        [
          memberId,
          'Lucas Bernard added you to "WatchTower Platform v1.0".',
          JSON.stringify({ projectId, projectName: 'WatchTower Platform v1.0', actorName: 'Lucas Bernard' }),
          projectId,
          memberId,
          'Lucas Bernard assigned you to "Implement Kanban status transitions".',
          JSON.stringify({
            taskTitle: 'Implement Kanban status transitions',
            projectId,
            projectName: 'WatchTower Platform v1.0',
            actorName: 'Lucas Bernard',
          }),
        ],
      );
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runSeed()
    .then(async () => {
      console.log('Development seed completed.');
      await closePool();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Seed failed:', err.message);
      await closePool();
      process.exit(1);
    });
}
