import * as userRepository from '../repositories/userRepository.js';
import { serializeUser } from '../utils/serializers.js';
import { generateDeadlineNotifications } from './notificationService.js';

/**
 * Generate due-soon and overdue notifications for every active user.
 * Each notification uses a deterministic dedup key (task + day), so running
 * this repeatedly on startup or on a timer never creates duplicates.
 */
export async function runDeadlineSweep() {
  const rows = await userRepository.listActiveUsers();
  let generated = 0;

  for (const row of rows) {
    const user = serializeUser(row);
    if (!user.notificationPrefs.dueSoon) continue;
    await generateDeadlineNotifications(user);
    generated += 1;
  }

  return { usersChecked: rows.length, usersProcessed: generated };
}

/**
 * Start the periodic sweep. The timer is unref'd so it never keeps a test
 * process or a one-off script alive.
 */
export function startDeadlineScheduler(intervalMs = 60 * 60 * 1000) {
  const timer = setInterval(() => {
    runDeadlineSweep().catch((err) => {
      console.error('[WatchTower] Deadline sweep failed:', err?.message || 'Unknown error');
    });
  }, intervalMs);
  timer.unref?.();

  return () => clearInterval(timer);
}
