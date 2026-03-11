/**
 * Require an environment variable at runtime.
 * Throws immediately with a clear message if the var is missing or empty.
 * Use for server-only secrets that must never silently degrade.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Add it to .env.local and the Vercel dashboard.`
    );
  }
  return value;
}
