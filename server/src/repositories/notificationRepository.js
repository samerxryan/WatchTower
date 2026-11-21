import { execute } from '../database/pool.js';

export async function insertNotification(
  {
    userId,
    type,
    title,
    message,
    payload = null,
    relatedEntityType = null,
    relatedEntityId = null,
    dedupKey = null,
  },
  connection = null,
) {
  const rows = await execute(
    `INSERT IGNORE INTO notifications
       (user_id, type, title, message, payload, related_entity_type, related_entity_id, dedup_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      type,
      title,
      message,
      payload ? JSON.stringify(payload) : null,
      relatedEntityType,
      relatedEntityId,
      dedupKey,
    ],
    connection,
  );
  return rows.affectedRows > 0 ? rows.insertId : null;
}

export async function listNotifications(userId, { unreadOnly, limit, offset }) {
  const where = ['user_id = ?'];
  const params = [userId];
  if (unreadOnly) {
    where.push('is_read = 0');
  }
  const whereSql = `WHERE ${where.join(' AND ')}`;

  const countRows = await execute(`SELECT COUNT(*) AS total FROM notifications ${whereSql}`, params);
  const total = Number(countRows[0]?.total ?? 0);

  const rows = await execute(
    `SELECT * FROM notifications ${whereSql}
     ORDER BY is_read ASC, created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return { rows, total };
}

export async function countUnreadNotifications(userId) {
  const rows = await execute(
    'SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND is_read = 0',
    [userId],
  );
  return Number(rows[0]?.total ?? 0);
}

export async function markNotificationRead(notificationId, userId, connection = null) {
  const rows = await execute(
    `UPDATE notifications
     SET is_read = 1, read_at = UTC_TIMESTAMP()
     WHERE id = ? AND user_id = ? AND is_read = 0`,
    [notificationId, userId],
    connection,
  );
  if (rows.affectedRows > 0) {
    return true;
  }
  const existing = await execute(
    'SELECT id FROM notifications WHERE id = ? AND user_id = ? LIMIT 1',
    [notificationId, userId],
    connection,
  );
  return existing.length > 0;
}

export async function markAllNotificationsRead(userId, connection = null) {
  const rows = await execute(
    `UPDATE notifications
     SET is_read = 1, read_at = UTC_TIMESTAMP()
     WHERE user_id = ? AND is_read = 0`,
    [userId],
    connection,
  );
  return rows.affectedRows;
}
