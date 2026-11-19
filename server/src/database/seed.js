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
    preferredLanguage: 'fr',
    preferredTheme: 'dark',
  },
  {
    fullName: 'Lucas Bernard',
    email: 'manager@watchtower.local',
    role: 'PROJECT_MANAGER',
    preferredLanguage: 'fr',
    preferredTheme: 'light',
  },
  {
    fullName: 'Sarah Jenkins',
    email: 'member@watchtower.local',
    role: 'TEAM_MEMBER',
    preferredLanguage: 'en',
    preferredTheme: 'light',
  },
];

export async function runSeed() {
  if (env.isProduction) {
    throw new Error('Seed script is forbidden in production.');
  }

  const demoPassword = process.env.SEED_DEMO_PASSWORD || 'WatchTower!Demo2026';
  const passwordHash = await bcrypt.hash(demoPassword, 12);

  await withTransaction(async (conn) => {
    for (const user of DEMO_USERS) {
      await conn.execute(
        `INSERT INTO users (full_name, email, password_hash, role, preferred_language, preferred_theme)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE full_name = VALUES(full_name)`,
        [
          user.fullName,
          user.email,
          passwordHash,
          user.role,
          user.preferredLanguage,
          user.preferredTheme,
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
        `INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, created_by, due_date)
         VALUES
           (?, 'Configure JWT & RBAC guards', 'Enforce server-side role and membership checks on all endpoints.', 'DONE', 'URGENT', ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 2 DAY)),
           (?, 'Implement Kanban status transitions', 'Allow authorized team members to move tasks across columns.', 'IN_PROGRESS', 'HIGH', ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 5 DAY)),
           (?, 'Build bilingual FR/EN settings panel', 'Persist user language and theme preferences in MySQL.', 'TODO', 'MEDIUM', ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 9 DAY))`,
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
