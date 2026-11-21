import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, 'migrations');

export async function runMigrations() {
  if (!env.db.user || !env.db.database) {
    throw new Error('DB_USER and DB_NAME must be configured in .env before running migrations.');
  }

  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,
    multipleStatements: true,
    timezone: 'Z',
  });

  try {
    // DATETIME defaults use the session time zone; keep migration-created
    // timestamps in UTC like the rest of the application.
    await connection.query("SET time_zone = '+00:00'");

    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(120) PRIMARY KEY,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    const [appliedRows] = await connection.query('SELECT version FROM schema_migrations');
    const applied = new Set(appliedRows.map((row) => row.version));

    const files = (await fs.readdir(migrationsDir))
      .filter((name) => name.endsWith('.sql'))
      .sort();

    const executed = [];
    for (const file of files) {
      if (applied.has(file)) {
        continue;
      }
      const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
      await connection.beginTransaction();
      try {
        await connection.query(sql);
        await connection.query('INSERT INTO schema_migrations (version) VALUES (?)', [file]);
        await connection.commit();
        executed.push(file);
      } catch (err) {
        await connection.rollback();
        throw err;
      }
    }

    return executed;
  } finally {
    await connection.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then((executed) => {
      console.log(
        executed.length > 0
          ? `Applied migrations: ${executed.join(', ')}`
          : 'All migrations are already up to date.',
      );
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err.message);
      process.exit(1);
    });
}
