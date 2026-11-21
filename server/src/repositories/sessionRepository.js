import { execute } from '../database/pool.js';

export async function createSession(
  { userId, tokenHash, expiresAt, userAgent = null, ipAddress = null },
  connection = null,
) {
  const rows = await execute(
    `INSERT INTO user_sessions (user_id, token_hash, expires_at, user_agent, ip_address, last_used_at)
     VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
    [userId, tokenHash, expiresAt, userAgent, ipAddress],
    connection,
  );
  return rows.insertId;
}

export async function findActiveSessionWithUser(tokenHash, connection = null) {
  const rows = await execute(
    `SELECT
       s.id AS session_id,
       s.user_id AS session_user_id,
       s.expires_at AS session_expires_at,
       u.*
     FROM user_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ?
       AND s.revoked_at IS NULL
       AND s.expires_at > UTC_TIMESTAMP()
     LIMIT 1`,
    [tokenHash],
    connection,
  );
  return rows[0] ?? null;
}

export async function touchSession(sessionId, connection = null) {
  await execute('UPDATE user_sessions SET last_used_at = UTC_TIMESTAMP() WHERE id = ?', [sessionId], connection);
}

export async function revokeSessionByHash(tokenHash, connection = null) {
  const rows = await execute(
    'UPDATE user_sessions SET revoked_at = UTC_TIMESTAMP() WHERE token_hash = ? AND revoked_at IS NULL',
    [tokenHash],
    connection,
  );
  return rows.affectedRows > 0;
}

export async function revokeAllSessionsForUser(userId, { exceptSessionId = null } = {}, connection = null) {
  if (exceptSessionId) {
    await execute(
      `UPDATE user_sessions
       SET revoked_at = UTC_TIMESTAMP()
       WHERE user_id = ? AND revoked_at IS NULL AND id <> ?`,
      [userId, exceptSessionId],
      connection,
    );
    return;
  }
  await execute(
    'UPDATE user_sessions SET revoked_at = UTC_TIMESTAMP() WHERE user_id = ? AND revoked_at IS NULL',
    [userId],
    connection,
  );
}

export async function deleteExpiredSessions(connection = null) {
  await execute(
    'DELETE FROM user_sessions WHERE expires_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)',
    [],
    connection,
  );
}
