import { cleanupUnverifiedUsers, cleanupDeactivatedUsers } from './auth.service.js';
import { sendAccountDeletedEmail } from './email.service.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

let cleanupInterval: ReturnType<typeof setInterval> | null = null;

export function startCleanupScheduler() {
  // Run daily cleanup
  cleanupInterval = setInterval(async () => {
    try {
      await cleanupUnverifiedUsers();
      console.log('[Cleanup] Removed unverified users older than 1 month');
    } catch (err) {
      console.error('[Cleanup] Unverified users cleanup error:', err);
    }

    try {
      const deleted = await cleanupDeactivatedUsers();
      if (deleted.length > 0) {
        console.log(`[Cleanup] Permanently deleted ${deleted.length} deactivated user(s)`);
        for (const user of deleted) {
          try {
            await sendAccountDeletedEmail(user.email);
          } catch { /* best-effort */ }
        }
      }
    } catch (err) {
      console.error('[Cleanup] Deactivated users cleanup error:', err);
    }
  }, ONE_DAY_MS);

  // Also run once at startup
  cleanupUnverifiedUsers().catch((err) => {
    console.error('[Cleanup] Initial unverified cleanup error:', err);
  });
  cleanupDeactivatedUsers().then((deleted) => {
    if (deleted.length > 0) {
      console.log(`[Cleanup] Initial: permanently deleted ${deleted.length} deactivated user(s)`);
      for (const user of deleted) {
        sendAccountDeletedEmail(user.email).catch(() => {});
      }
    }
  }).catch((err) => {
    console.error('[Cleanup] Initial deactivated cleanup error:', err);
  });
}

export function stopCleanupScheduler() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
