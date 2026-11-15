import type { D1DatabaseLike } from './push';

export const PUSH_EVENT_RETENTION_MS = 30 * 86_400_000;
const CLEANUP_BATCH_SIZE = 500;

/**
 * Removes old technical delivery records in bounded batches.
 * Active subscriptions and pending notifications are never deleted here.
 */
export async function cleanupPushHistory(db: D1DatabaseLike, now: number): Promise<void> {
  const cutoff = now - PUSH_EVENT_RETENTION_MS;
  await Promise.all([
    db.prepare(`
      DELETE FROM scheduled_notifications
      WHERE id IN (
        SELECT id FROM scheduled_notifications
        WHERE sent_at_ms IS NOT NULL AND sent_at_ms < ?
        ORDER BY sent_at_ms ASC
        LIMIT ?
      )
    `).bind(cutoff, CLEANUP_BATCH_SIZE).run(),
    db.prepare(`
      DELETE FROM scheduled_notifications
      WHERE id IN (
        SELECT id FROM scheduled_notifications
        WHERE failed_at_ms IS NOT NULL AND failed_at_ms < ?
        ORDER BY failed_at_ms ASC
        LIMIT ?
      )
    `).bind(cutoff, CLEANUP_BATCH_SIZE).run(),
  ]);
}
