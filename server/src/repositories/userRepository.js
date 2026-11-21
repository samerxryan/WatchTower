import { execute } from '../database/pool.js';

const USER_COLUMNS = `
  id, full_name, email, password_hash, role, avatar_url, is_active,
  preferred_language, preferred_theme, notification_prefs, created_at, updated_at
`;

const SORTABLE = {
  fullName: 'full_name',
  email: 'email',
  role: 'role',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

function orderBy(sortBy, sortOrder) {
  const column = SORTABLE[sortBy] || 'created_at';
  const direction = sortOrder === 'asc' ? 'ASC' : 'DESC';
  return `ORDER BY ${column} ${direction}`;
}

export async function findUserById(id, connection = null) {
  const rows = await execute(`SELECT ${USER_COLUMNS} FROM users WHERE id = ? LIMIT 1`, [id], connection);
  return rows[0] ?? null;
}

export async function findUserByEmail(email, connection = null) {
  const rows = await execute(
    `SELECT ${USER_COLUMNS} FROM users WHERE email = ? LIMIT 1`,
    [email],
    connection,
  );
  return rows[0] ?? null;
}

export async function emailExists(email, connection = null) {
  const rows = await execute('SELECT id FROM users WHERE email = ? LIMIT 1', [email], connection);
  return rows.length > 0;
}

export async function createUser(
  { fullName, email, passwordHash, role = 'TEAM_MEMBER', preferredLanguage = 'fr', preferredTheme = 'light' },
  connection = null,
) {
  const rows = await execute(
    `INSERT INTO users (full_name, email, password_hash, role, preferred_language, preferred_theme)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [fullName, email, passwordHash, role, preferredLanguage, preferredTheme],
    connection,
  );
  const id = rows.insertId;
  return findUserById(id, connection);
}

export async function updateProfile(id, { fullName, avatarUrl }, connection = null) {
  const fields = [];
  const params = [];

  if (fullName !== undefined) {
    fields.push('full_name = ?');
    params.push(fullName);
  }
  if (avatarUrl !== undefined) {
    fields.push('avatar_url = ?');
    params.push(avatarUrl);
  }
  if (fields.length === 0) {
    return findUserById(id, connection);
  }

  params.push(id);
  await execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params, connection);
  return findUserById(id, connection);
}

export async function updatePassword(id, passwordHash, connection = null) {
  await execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id], connection);
}

export async function updatePreferences(
  id,
  { preferredLanguage, preferredTheme, notificationPrefs },
  connection = null,
) {
  const fields = [];
  const params = [];

  if (preferredLanguage !== undefined) {
    fields.push('preferred_language = ?');
    params.push(preferredLanguage);
  }
  if (preferredTheme !== undefined) {
    fields.push('preferred_theme = ?');
    params.push(preferredTheme);
  }
  if (notificationPrefs !== undefined) {
    fields.push('notification_prefs = ?');
    params.push(JSON.stringify(notificationPrefs));
  }
  if (fields.length === 0) {
    return findUserById(id, connection);
  }

  params.push(id);
  await execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params, connection);
  return findUserById(id, connection);
}

/**
 * Row lock used by forgot-password so two concurrent requests cannot both
 * leave an active reset token for the same account.
 */
export async function lockUserForUpdate(id, connection) {
  await execute('SELECT id FROM users WHERE id = ? FOR UPDATE', [id], connection);
}

export async function listUsers({ search, role, isActive, sortBy, sortOrder, limit, offset }) {
  const where = [];
  const params = [];

  if (search) {
    where.push('(full_name LIKE ? OR email LIKE ?)');
    const pattern = `%${search}%`;
    params.push(pattern, pattern);
  }
  if (role) {
    where.push('role = ?');
    params.push(role);
  }
  if (isActive !== undefined) {
    where.push('is_active = ?');
    params.push(isActive ? 1 : 0);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const countRows = await execute(`SELECT COUNT(*) AS total FROM users ${whereSql}`, params);
  const total = Number(countRows[0]?.total ?? 0);

  const rows = await execute(
    `SELECT ${USER_COLUMNS} FROM users ${whereSql} ${orderBy(sortBy, sortOrder)} LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return { rows, total };
}

export async function updateRole(id, role, connection = null) {
  await execute('UPDATE users SET role = ? WHERE id = ?', [role, id], connection);
  return findUserById(id, connection);
}

export async function updateStatus(id, isActive, connection = null) {
  await execute('UPDATE users SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id], connection);
  return findUserById(id, connection);
}

export async function countActiveAdmins(connection = null, excludeUserId = null) {
  const rows = excludeUserId
    ? await execute(
        `SELECT COUNT(*) AS total FROM users WHERE role = 'ADMIN' AND is_active = 1 AND id <> ?`,
        [excludeUserId],
        connection,
      )
    : await execute(
        `SELECT COUNT(*) AS total FROM users WHERE role = 'ADMIN' AND is_active = 1`,
        [],
        connection,
      );
  return Number(rows[0]?.total ?? 0);
}

export async function listActiveUsers(connection = null) {
  return execute(
    `SELECT ${USER_COLUMNS} FROM users WHERE is_active = 1 ORDER BY id ASC`,
    [],
    connection,
  );
}

export async function findActiveUsersByIds(ids, connection = null) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(', ');
  return execute(
    `SELECT id, full_name, email, role, is_active FROM users WHERE id IN (${placeholders})`,
    ids,
    connection,
  );
}
