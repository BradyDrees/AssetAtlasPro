"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import type { Product } from "./inbox-page";
import { productTheme } from "./inbox-page";

interface PushSubscriptionPromptProps {
  product: Product;
}

/**
 * Inline prompt to enable push notifications.
 * Shows only if notifications aren't already granted/denied.
 * Handles subscription and sends to /api/push/subscribe.
 */
export function PushSubscriptionPrompt({
  product,
}: PushSubscriptionPromptProps) {
  const t = useTranslations("messaging");
  const theme = productTheme[product];

  const [visible, setVisible] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    // Only show if Notification API exists and permission is "default" (not yet decided)
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      // Delay showing prompt to avoid overwhelming on first visit
      const timer = setTimeout(() => setVisible(true), 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleEnable = async () => {
    if (subscribing) return;
    setSubscribing(true);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setVisible(false);
        setSubscribing(false);
        return;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Get VAPID public key from env
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!vapidKey) {
        console.warn("[push] VAPID public key not configured");
        setVisible(false);
        setSubscribing(false);
        return;
      }

      // Subscribe
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
      });

      const keys = subscription.toJSON().keys;

      // Save to server
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh: keys?.p256dh ?? "",
          auth: keys?.auth ?? "",
        }),
      });

      setVisible(false);
    } catch (err) {
      console.error("[push] Subscription error:", err);
    } finally {
      setSubscribing(false);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="mx-4 mt-3 px-4 py-3 rounded-xl border border-edge-secondary bg-surface-secondary">
      <div className="flex items-start gap-3">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${theme.avatarBg} ${theme.avatarText}`}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
            />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-content-primary">
            {t("notifications.enableTitle")}
          </p>
          <p className="text-xs text-content-tertiary mt-0.5">
            {t("notifications.enableBody")}
          </p>

          <div className="flex gap-2 mt-3">
            <button
              onClick={handleEnable}
              disabled={subscribing}
              className={`px-3 py-1.5 text-xs font-medium text-white rounded-lg ${theme.sendBg} disabled:opacity-40`}
            >
              {subscribing ? "..." : t("notifications.enable")}
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs text-content-tertiary hover:text-content-primary"
            >
              {t("notifications.later")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
