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
      dateStrings: false,
    });
  }
  return pool;
}

export async function query(sql, params = []) {
  const activePool = getPool();
  const [rows] = await activePool.execute(sql, params);
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
      database: env.db.database,
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
