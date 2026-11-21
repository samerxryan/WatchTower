import { execute } from '../database/pool.js';

const SORTABLE = {
  name: 'p.name',
  status: 'p.status',
  startDate: 'p.start_date',
  dueDate: 'p.due_date',
  createdAt: 'p.created_at',
  updatedAt: 'p.updated_at',
};

const PROJECT_AGGREGATES = `
  (SELECT COUNT(*) FROM project_members pmc WHERE pmc.project_id = p.id) AS member_count,
  (SELECT COUNT(*) FROM tasks tc WHERE tc.project_id = p.id AND tc.deleted_at IS NULL) AS task_count,
  (SELECT COUNT(*) FROM tasks tc WHERE tc.project_id = p.id AND tc.deleted_at IS NULL AND tc.status = 'DONE') AS completed_task_count
`;

function orderBy(sortBy, sortOrder) {
  const column = SORTABLE[sortBy] || 'p.created_at';
  const direction = sortOrder === 'asc' ? 'ASC' : 'DESC';
  return `ORDER BY ${column} ${direction}`;
}

export function accessCondition(user, alias = 'p') {
  if (user.role === 'ADMIN') {
    return { sql: '1 = 1', params: [] };
  }
  return {
    sql: `(${alias}.owner_id = ? OR EXISTS (
      SELECT 1 FROM project_members pmx
      WHERE pmx.project_id = ${alias}.id AND pmx.user_id = ?
    ))`,
    params: [user.id, user.id],
  };
}

export async function listProjects(user, { status, search, ownerId, sortBy, sortOrder, limit, offset }) {
  const access = accessCondition(user, 'p');
  const where = [access.sql];
  const params = [...access.params];

  if (status) {
    where.push('p.status = ?');
    params.push(status);
  }
  if (ownerId) {
    where.push('p.owner_id = ?');
    params.push(ownerId);
  }
  if (search) {
    where.push('(p.name LIKE ? OR p.description LIKE ?)');
    const pattern = `%${search}%`;
    params.push(pattern, pattern);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;
  const countRows = await execute(`SELECT COUNT(*) AS total FROM projects p ${whereSql}`, params);
  const total = Number(countRows[0]?.total ?? 0);

  const rows = await execute(
    `SELECT p.*, u.full_name AS owner_name, ${PROJECT_AGGREGATES}
     FROM projects p
     JOIN users u ON u.id = p.owner_id
     ${whereSql}
     ${orderBy(sortBy, sortOrder)}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return { rows, total };
}

export async function listAllProjectsForUser(user) {
  const access = accessCondition(user, 'p');
  return execute(
    `SELECT p.*, u.full_name AS owner_name, ${PROJECT_AGGREGATES}
     FROM projects p
     JOIN users u ON u.id = p.owner_id
     WHERE ${access.sql}
     ORDER BY p.created_at DESC`,
    access.params,
  );
}

export async function findProjectById(projectId, connection = null) {
  const rows = await execute(
    `SELECT p.*, u.full_name AS owner_name, ${PROJECT_AGGREGATES}
     FROM projects p
     JOIN users u ON u.id = p.owner_id
     WHERE p.id = ?
     LIMIT 1`,
    [projectId],
    connection,
  );
  return rows[0] ?? null;
}

/**
 * Returns the project plus the current user's membership role, if any.
 * A single query keeps the authorization check consistent.
 */
export async function findProjectAccess(projectId, userId, connection = null) {
  const rows = await execute(
    `SELECT p.*, u.full_name AS owner_name, pm.project_role AS member_role, ${PROJECT_AGGREGATES}
     FROM projects p
     JOIN users u ON u.id = p.owner_id
     LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
     WHERE p.id = ?
     LIMIT 1`,
    [userId, projectId],
    connection,
  );
  return rows[0] ?? null;
}

export async function createProject(
  { name, description, status, startDate, dueDate, ownerId },
  connection = null,
) {
  const rows = await execute(
    `INSERT INTO projects (name, description, status, start_date, due_date, owner_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, description, status, startDate, dueDate, ownerId],
    connection,
  );
  return rows.insertId;
}

export async function updateProject(projectId, fields, connection = null) {
  const columns = {
    name: 'name',
    description: 'description',
    status: 'status',
    startDate: 'start_date',
    dueDate: 'due_date',
    archivedAt: 'archived_at',
  };

  const assignments = [];
  const params = [];
  for (const [key, value] of Object.entries(fields)) {
    if (!columns[key]) continue;
    assignments.push(`${columns[key]} = ?`);
    params.push(value);
  }
  if (assignments.length === 0) {
    return;
  }

  params.push(projectId);
  await execute(`UPDATE projects SET ${assignments.join(', ')} WHERE id = ?`, params, connection);
}

export async function archiveProject(projectId, connection = null) {
  await execute(
    `UPDATE projects
     SET status = 'ARCHIVED', archived_at = UTC_TIMESTAMP()
     WHERE id = ?`,
    [projectId],
    connection,
  );
}

export async function listProjectMembers(projectId) {
  return execute(
    `SELECT pm.*, u.full_name, u.email, u.role AS global_role
     FROM project_members pm
     JOIN users u ON u.id = pm.user_id
     WHERE pm.project_id = ?
     ORDER BY (pm.project_role = 'MANAGER') DESC, u.full_name ASC`,
    [projectId],
  );
}

/**
 * Users who should be informed when a task changes: the project owner and any
 * project-level manager. Used by the notification service so a status change
 * is visible beyond the assignee.
 */
export async function listProjectManagers(projectId, ownerId, connection = null) {
  return execute(
    `SELECT DISTINCT u.id, u.full_name, u.notification_prefs, u.is_active
     FROM users u
     WHERE u.is_active = 1
       AND (
         u.id = ?
         OR EXISTS (
           SELECT 1 FROM project_members pm
           WHERE pm.project_id = ? AND pm.user_id = u.id AND pm.project_role = 'MANAGER'
         )
       )`,
    [ownerId, projectId],
    connection,
  );
}

export async function findMember(projectId, userId, connection = null) {
  const rows = await execute(
    'SELECT * FROM project_members WHERE project_id = ? AND user_id = ? LIMIT 1',
    [projectId, userId],
    connection,
  );
  return rows[0] ?? null;
}

export async function addProjectMember(
  { projectId, userId, projectRole = 'MEMBER' },
  connection = null,
) {
  const rows = await execute(
    `INSERT INTO project_members (project_id, user_id, project_role)
     VALUES (?, ?, ?)`,
    [projectId, userId, projectRole],
    connection,
  );
  return rows.insertId;
}

export async function removeProjectMember(projectId, userId, connection = null) {
  const rows = await execute(
    'DELETE FROM project_members WHERE project_id = ? AND user_id = ?',
    [projectId, userId],
    connection,
  );
  return rows.affectedRows > 0;
}

export async function unassignRemovedMemberTasks(projectId, userId, connection = null) {
  await execute(
    `UPDATE tasks SET assignee_id = NULL
     WHERE project_id = ? AND assignee_id = ?`,
    [projectId, userId],
    connection,
  );
}

export async function countProjectMembers(projectId, connection = null) {
  const rows = await execute(
    'SELECT COUNT(*) AS total FROM project_members WHERE project_id = ?',
    [projectId],
    connection,
  );
  return Number(rows[0]?.total ?? 0);
}

export async function listProjectMemberIds(projectId, connection = null) {
  const rows = await execute(
    'SELECT user_id FROM project_members WHERE project_id = ?',
    [projectId],
    connection,
  );
  return rows.map((row) => Number(row.user_id));
}
