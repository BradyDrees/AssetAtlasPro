/**
 * Locale-aware date/time formatting utilities.
 * Uses Intl.DateTimeFormat — handles en-US and es-US natively.
 */

type Locale = "en" | "es";

const INTL_LOCALE: Record<Locale, string> = { en: "en-US", es: "es-US" };

/**
 * Format a date as "Mon, Mar 23, 2026"
 * Options: weekday (default true), year (default true)
 */
export function formatDate(
  date: string | Date,
  locale: Locale = "en",
  options?: { weekday?: boolean; year?: boolean }
): string {
  const d = toDate(date);
  if (isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString(INTL_LOCALE[locale], {
    weekday: options?.weekday !== false ? "short" : undefined,
    month: "short",
    day: "numeric",
    year: options?.year !== false ? "numeric" : undefined,
  });
}

/**
 * Format a time string "HH:MM:SS" or "HH:MM" → "8:00 AM"
 */
export function formatTime(
  time: string,
  locale: Locale = "en"
): string {
  const parts = time.split(":");
  if (parts.length < 2) return time;
  const d = new Date();
  d.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0);
  return d.toLocaleTimeString(INTL_LOCALE[locale], {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Format a full datetime: "Mar 23, 2026, 8:00 AM"
 */
export function formatDateTime(
  date: string | Date,
  locale: Locale = "en"
): string {
  const d = toDate(date);
  if (isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString(INTL_LOCALE[locale], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Format relative: "Today", "Yesterday", "Tomorrow", or fall back to formatDate
 */
export function formatRelativeDate(
  date: string | Date,
  locale: Locale = "en"
): string {
  const d = toDate(date);
  if (isNaN(d.getTime())) return String(date);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / 86_400_000
  );

  if (diffDays === 0) return locale === "es" ? "Hoy" : "Today";
  if (diffDays === -1) return locale === "es" ? "Ayer" : "Yesterday";
  if (diffDays === 1) return locale === "es" ? "Mañana" : "Tomorrow";

  return formatDate(d, locale);
}

/** Parse string → Date, handling "YYYY-MM-DD" without timezone shift */
function toDate(input: string | Date): Date {
  if (input instanceof Date) return input;
  // Bare date "YYYY-MM-DD" → append T00:00:00 to parse as local, not UTC
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return new Date(input + "T00:00:00");
  }
  return new Date(input);
}
