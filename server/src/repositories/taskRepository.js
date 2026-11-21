import { execute } from '../database/pool.js';

const SORTABLE = {
  title: 't.title',
  status: 't.status',
  priority: 't.priority',
  dueDate: 't.due_date',
  createdAt: 't.created_at',
  updatedAt: 't.updated_at',
};

const TASK_SELECT = `
  t.*,
  p.name AS project_name,
  p.status AS project_status,
  p.owner_id AS project_owner_id,
  pm.project_role AS member_role,
  a.full_name AS assignee_name
`;

function orderBy(sortBy, sortOrder) {
  const column = SORTABLE[sortBy] || 't.created_at';
  const direction = sortOrder === 'asc' ? 'ASC' : 'DESC';
  return `ORDER BY ${column} ${direction}`;
}

export function taskAccessCondition(user) {
  if (user.role === 'ADMIN') {
    return { sql: '1 = 1', params: [] };
  }
  return {
    sql: `(p.owner_id = ? OR EXISTS (
      SELECT 1 FROM project_members pmx
      WHERE pmx.project_id = t.project_id AND pmx.user_id = ?
    ))`,
    params: [user.id, user.id],
  };
}

export async function listTasks(
  user,
  { projectId, status, priority, assigneeId, search, sortBy, sortOrder, limit, offset },
) {
  const access = taskAccessCondition(user);
  const where = [access.sql, 't.deleted_at IS NULL'];
  const params = [...access.params];

  if (projectId) {
    where.push('t.project_id = ?');
    params.push(projectId);
  }
  if (status) {
    where.push('t.status = ?');
    params.push(status);
  }
  if (priority) {
    where.push('t.priority = ?');
    params.push(priority);
  }
  if (assigneeId) {
    where.push('t.assignee_id = ?');
    params.push(assigneeId);
  }
  if (search) {
    where.push('(t.title LIKE ? OR t.description LIKE ?)');
    const pattern = `%${search}%`;
    params.push(pattern, pattern);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;
  const countRows = await execute(
    `SELECT COUNT(*) AS total
     FROM tasks t
     JOIN projects p ON p.id = t.project_id
     ${whereSql}`,
    params,
  );
  const total = Number(countRows[0]?.total ?? 0);

  const rows = await execute(
    `SELECT ${TASK_SELECT}
     FROM tasks t
     JOIN projects p ON p.id = t.project_id
     LEFT JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = ?
     LEFT JOIN users a ON a.id = t.assignee_id
     ${whereSql}
     ${orderBy(sortBy, sortOrder)}
     LIMIT ? OFFSET ?`,
    [user.id, ...params, limit, offset],
  );

  return { rows, total };
}

export async function listAllTasksForUser(user) {
  const access = taskAccessCondition(user);
  return execute(
    `SELECT ${TASK_SELECT}
     FROM tasks t
     JOIN projects p ON p.id = t.project_id
     LEFT JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = ?
     LEFT JOIN users a ON a.id = t.assignee_id
     WHERE ${access.sql} AND t.deleted_at IS NULL
     ORDER BY t.created_at DESC`,
    [user.id, ...access.params],
  );
}

export async function findTaskById(taskId, connection = null) {
  const rows = await execute(
    `SELECT ${TASK_SELECT}
     FROM tasks t
     JOIN projects p ON p.id = t.project_id
     LEFT JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = 0
     LEFT JOIN users a ON a.id = t.assignee_id
     WHERE t.id = ? AND t.deleted_at IS NULL
     LIMIT 1`,
    [taskId],
    connection,
  );
  return rows[0] ?? null;
}

/**
 * Returns the task with its project authorization context for a specific user.
 */
export async function findTaskAccess(taskId, userId, connection = null) {
  const rows = await execute(
    `SELECT ${TASK_SELECT}
     FROM tasks t
     JOIN projects p ON p.id = t.project_id
     LEFT JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = ?
     LEFT JOIN users a ON a.id = t.assignee_id
     WHERE t.id = ? AND t.deleted_at IS NULL
     LIMIT 1`,
    [userId, taskId],
    connection,
  );
  return rows[0] ?? null;
}

export async function createTask(
  { projectId, title, description, status, priority, assigneeId, createdBy, dueDate, completedAt },
  connection = null,
) {
  const rows = await execute(
    `INSERT INTO tasks
       (project_id, title, description, status, priority, assignee_id, created_by, due_date, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [projectId, title, description, status, priority, assigneeId, createdBy, dueDate, completedAt],
    connection,
  );
  return rows.insertId;
}

export async function updateTask(taskId, fields, connection = null) {
  const columns = {
    title: 'title',
    description: 'description',
    status: 'status',
    priority: 'priority',
    assigneeId: 'assignee_id',
    dueDate: 'due_date',
    completedAt: 'completed_at',
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

  params.push(taskId);
  await execute(`UPDATE tasks SET ${assignments.join(', ')} WHERE id = ?`, params, connection);
}

export async function deleteTask(taskId, connection = null) {
  // Soft delete preserves comments and activity history for auditability.
  const rows = await execute(
    'UPDATE tasks SET deleted_at = UTC_TIMESTAMP() WHERE id = ? AND deleted_at IS NULL',
    [taskId],
    connection,
  );
  return rows.affectedRows > 0;
}

export async function listOverdueTasksForUser(userId) {
  return execute(
    `SELECT t.*, p.name AS project_name
     FROM tasks t
     JOIN projects p ON p.id = t.project_id
     WHERE t.assignee_id = ?
       AND t.deleted_at IS NULL
       AND p.status <> 'ARCHIVED'
       AND t.status <> 'DONE'
       AND t.due_date IS NOT NULL
       AND t.due_date < UTC_TIMESTAMP()
     ORDER BY t.due_date ASC`,
    [userId],
  );
}

export async function listDueSoonTasksForUser(userId, hours = 24) {
  return execute(
    `SELECT t.*, p.name AS project_name
     FROM tasks t
     JOIN projects p ON p.id = t.project_id
     WHERE t.assignee_id = ?
       AND t.deleted_at IS NULL
       AND p.status <> 'ARCHIVED'
       AND t.status <> 'DONE'
       AND t.due_date IS NOT NULL
       AND t.due_date >= UTC_TIMESTAMP()
       AND t.due_date <= DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? HOUR)
     ORDER BY t.due_date ASC`,
    [userId, hours],
  );
}

export async function listActiveTasksForUser(userId) {
  return execute(
    `SELECT t.*, p.name AS project_name
     FROM tasks t
     JOIN projects p ON p.id = t.project_id
     WHERE t.assignee_id = ? AND t.status <> 'DONE'
       AND t.deleted_at IS NULL AND p.status <> 'ARCHIVED'
     ORDER BY t.due_date ASC`,
    [userId],
  );
}
