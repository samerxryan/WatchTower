import { execute } from '../database/pool.js';

export async function invalidateActiveTokensForUser(userId, connection = null) {
  await execute(
    `UPDATE password_reset_tokens
     SET used_at = UTC_TIMESTAMP()
     WHERE user_id = ? AND used_at IS NULL`,
    [userId],
    connection,
  );
}

export async function createResetToken({ userId, tokenHash, expiresAt }, connection = null) {
  const rows = await execute(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES (?, ?, ?)`,
    [userId, tokenHash, expiresAt],
    connection,
  );
  return rows.insertId;
}

export async function findActiveResetToken(tokenHash, connection = null) {
  const rows = await execute(
    `SELECT prt.id, prt.user_id, prt.expires_at, u.email, u.is_active
     FROM password_reset_tokens prt
     JOIN users u ON u.id = prt.user_id
     WHERE prt.token_hash = ?
       AND prt.used_at IS NULL
       AND prt.expires_at > UTC_TIMESTAMP()
     LIMIT 1`,
    [tokenHash],
    connection,
  );
  return rows[0] ?? null;
}

export async function markResetTokenUsed(id, connection = null) {
  await execute(
    'UPDATE password_reset_tokens SET used_at = UTC_TIMESTAMP() WHERE id = ? AND used_at IS NULL',
    [id],
    connection,
  );
}
