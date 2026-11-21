import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

let pool = null;

export function isDatabaseConfigured() {
  return Boolean(env.db.host && env.db.user && env.db.database);
}

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: env.db.host,
      port: env.db.port,
      user: env.db.user || undefined,
      password: env.db.password || undefined,
      database: env.db.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      timezone: 'Z',
      // Keep DATE columns as YYYY-MM-DD strings so project deadlines never shift
      // when the server timezone differs from UTC.
      dateStrings: ['DATE'],
    });

    // mysql2's `timezone` option only converts values; it does not change the
    // MySQL session time zone. Force every pooled connection to UTC so
    // CURRENT_TIMESTAMP defaults and UTC_TIMESTAMP() writes stay consistent.
    pool.on('connection', (connection) => {
      connection.query("SET time_zone = '+00:00'", (err) => {
        if (err) {
          console.error('[WatchTower] Failed to set UTC session time zone:', err.message);
        }
      });
    });
  }
  return pool;
}

export async function query(sql, params = []) {
  const activePool = getPool();
  const [rows] = await activePool.execute(sql, params);
  return rows;
}

/**
 * Execute a statement on the shared pool or on an existing transaction connection.
 */
export async function execute(sql, params = [], connection = null) {
  const target = connection ?? getPool();
  const [rows] = await target.execute(sql, params);
  return rows;
}

export async function withTransaction(callback) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function checkDatabaseHealth() {
  if (!isDatabaseConfigured()) {
    return {
      configured: false,
      connected: false,
      reason: 'DB_USER or DB_NAME is not configured in environment variables.',
    };
  }

  try {
    await query('SELECT 1 AS ok');
    return {
      configured: true,
      connected: true,
    };
  } catch (err) {
    return {
      configured: true,
      connected: false,
      reason: err?.code || 'CONNECTION_ERROR',
    };
  }
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
