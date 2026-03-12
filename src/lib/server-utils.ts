/**
 * Wrap an async operation with a timeout.
 * If the operation exceeds `ms`, the returned promise rejects.
 *
 * Note: Supabase JS client doesn't support AbortSignal on queries,
 * so this races against a timer rather than cancelling the underlying request.
 * The DB query may still complete server-side, but the caller won't wait for it.
 */
export function withTimeout<T>(
  fn: () => Promise<T>,
  ms: number
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/** Default timeout for cron jobs and webhooks (55s — Vercel max is 60s). */
export const CRON_TIMEOUT_MS = 55_000;

/** Default timeout for individual DB operations (10s). */
export const DB_TIMEOUT_MS = 10_000;
