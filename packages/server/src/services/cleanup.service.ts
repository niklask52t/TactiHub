import { cleanupUnverifiedUsers } from './auth.service.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

let cleanupInterval: ReturnType<typeof setInterval> | null = null;

export function startCleanupScheduler() {
  // Run daily cleanup
  cleanupInterval = setInterval(async () => {
    try {
      await cleanupUnverifiedUsers();
      console.log('[Cleanup] Removed unverified users older than 1 month');
    } catch (err) {
      console.error('[Cleanup] Error:', err);
    }
  }, ONE_DAY_MS);

  // Also run once at startup
  cleanupUnverifiedUsers().catch((err) => {
    console.error('[Cleanup] Initial cleanup error:', err);
  });
}

export function stopCleanupScheduler() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
