import { execute } from '../database/pool.js';

const ACTIVITY_SELECT = `
  al.*,
  u.full_name AS actor_name,
  p.name AS project_name
`;

export async function insertActivity(
  { actorId = null, projectId = null, taskId = null, action, description },
  connection = null,
) {
  const rows = await execute(
    `INSERT INTO activity_logs (actor_id, project_id, task_id, action, description)
     VALUES (?, ?, ?, ?, ?)`,
    [actorId, projectId, taskId, action, description],
    connection,
  );
  return rows.insertId;
}

export async function listProjectActivity(projectId, { limit, offset }) {
  const countRows = await execute(
    'SELECT COUNT(*) AS total FROM activity_logs WHERE project_id = ?',
    [projectId],
  );
  const total = Number(countRows[0]?.total ?? 0);

  const rows = await execute(
    `SELECT ${ACTIVITY_SELECT}
     FROM activity_logs al
     LEFT JOIN users u ON u.id = al.actor_id
     LEFT JOIN projects p ON p.id = al.project_id
     WHERE al.project_id = ?
     ORDER BY al.created_at DESC
     LIMIT ? OFFSET ?`,
    [projectId, limit, offset],
  );

  return { rows, total };
}

export async function listAccessibleActivity(user, { projectId, limit, offset }) {
  const params = [];
  const where = [];

  if (user.role === 'ADMIN') {
    where.push('1 = 1');
  } else {
    where.push(`(
      al.actor_id = ?
      OR EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = al.project_id AND pm.user_id = ?
      )
      OR EXISTS (
        SELECT 1 FROM projects p2
        WHERE p2.id = al.project_id AND p2.owner_id = ?
      )
    )`);
    params.push(user.id, user.id, user.id);
  }

  if (projectId) {
    where.push('al.project_id = ?');
    params.push(projectId);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;
  const countRows = await execute(`SELECT COUNT(*) AS total FROM activity_logs al ${whereSql}`, params);
  const total = Number(countRows[0]?.total ?? 0);

  const rows = await execute(
    `SELECT ${ACTIVITY_SELECT}
     FROM activity_logs al
     LEFT JOIN users u ON u.id = al.actor_id
     LEFT JOIN projects p ON p.id = al.project_id
     ${whereSql}
     ORDER BY al.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return { rows, total };
}
