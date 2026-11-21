import { execute } from '../database/pool.js';

export async function listCommentsByTask(taskId) {
  return execute(
    `SELECT c.*, u.full_name AS author_name
     FROM comments c
     JOIN users u ON u.id = c.author_id
     WHERE c.task_id = ? AND c.deleted_at IS NULL
     ORDER BY c.created_at ASC`,
    [taskId],
  );
}

export async function findCommentById(commentId, connection = null) {
  const rows = await execute(
    `SELECT c.*, u.full_name AS author_name
     FROM comments c
     JOIN users u ON u.id = c.author_id
     WHERE c.id = ?
     LIMIT 1`,
    [commentId],
    connection,
  );
  return rows[0] ?? null;
}

export async function createComment({ taskId, authorId, content }, connection = null) {
  const rows = await execute(
    'INSERT INTO comments (task_id, author_id, content) VALUES (?, ?, ?)',
    [taskId, authorId, content],
    connection,
  );
  return rows.insertId;
}

export async function updateCommentContent(commentId, content, connection = null) {
  await execute('UPDATE comments SET content = ? WHERE id = ?', [content, commentId], connection);
}

export async function softDeleteComment(commentId, connection = null) {
  const rows = await execute(
    'UPDATE comments SET deleted_at = UTC_TIMESTAMP() WHERE id = ? AND deleted_at IS NULL',
    [commentId],
    connection,
  );
  return rows.affectedRows > 0;
}
