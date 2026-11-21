import { execute } from '../database/pool.js';

/**
 * Append a security-relevant event. Details are stored as JSON and must never
 * contain passwords, tokens or full URLs with query strings.
 */
export async function insertAudit({ actorId = null, action, details = null }, connection = null) {
  await execute(
    `INSERT INTO audit_logs (actor_id, action, details) VALUES (?, ?, ?)`,
    [actorId, action, details ? JSON.stringify(details) : null],
    connection,
  );
}
