"use client";

import { useAppLocale } from "@/components/locale-provider";
import {
  formatDate as _formatDate,
  formatTime as _formatTime,
  formatDateTime as _formatDateTime,
  formatRelativeDate as _formatRelativeDate,
} from "@/lib/format-date";

/**
 * Client hook that wraps format-date utilities with the current locale.
 * Usage: const { formatDate, formatTime } = useFormatDate();
 */
export function useFormatDate() {
  const { locale } = useAppLocale();

  return {
    formatDate: (
      date: string | Date,
      options?: { weekday?: boolean; year?: boolean }
    ) => _formatDate(date, locale, options),
    formatTime: (time: string) => _formatTime(time, locale),
    formatDateTime: (date: string | Date) => _formatDateTime(date, locale),
    formatRelativeDate: (date: string | Date) =>
      _formatRelativeDate(date, locale),
  };
}
