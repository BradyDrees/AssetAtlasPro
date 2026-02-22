"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
} from "@/app/actions/notifications";
import type { VendorNotification } from "@/lib/vendor/types";

export function NotificationBell() {
  const t = useTranslations("vendor.nav");
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<VendorNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Load unread count on mount
  useEffect(() => {
    getUnreadCount().then(({ count }) => setUnreadCount(count));

    // Poll every 30 seconds
    const interval = setInterval(() => {
      getUnreadCount().then(({ count }) => setUnreadCount(count));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  async function handleOpen() {
    if (!isOpen && !loaded) {
      const { data } = await getNotifications({ limit: 15 });
      setNotifications(data);
      setLoaded(true);
    }
    setIsOpen(!isOpen);
  }

  async function handleMarkRead(id: string) {
    await markRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function handleMarkAllRead() {
    await markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  function formatRelativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg text-content-tertiary hover:text-content-primary hover:bg-surface-secondary transition-colors"
        aria-label={t("notifications")}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-surface-primary rounded-xl border border-edge-primary shadow-lg z-50">
          <div className="flex items-center justify-between p-3 border-b border-edge-secondary">
            <h3 className="text-sm font-semibold text-content-primary">
              {t("notifications")}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-content-quaternary">
                No notifications
              </p>
            </div>
          ) : (
            <div>
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.is_read && handleMarkRead(n.id)}
                  className={`w-full text-left px-3 py-3 border-b border-edge-secondary last:border-0 hover:bg-surface-secondary transition-colors ${
                    !n.is_read ? "bg-brand-50/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.is_read && (
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />
                    )}
                    <div className={`flex-1 ${n.is_read ? "pl-4" : ""}`}>
                      <p className="text-sm font-medium text-content-primary line-clamp-1">
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs text-content-tertiary line-clamp-2 mt-0.5">
                          {n.body}
                        </p>
                      )}
                      <p className="text-xs text-content-quaternary mt-1">
                        {formatRelativeTime(n.created_at)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
