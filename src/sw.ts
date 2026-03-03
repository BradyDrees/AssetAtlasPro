/// <reference lib="webworker" />

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkFirst, CacheFirst, ExpirationPlugin } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

// Scoped Supabase caching rules — only safe GET endpoints, never auth
const supabaseCache: typeof defaultCache = [
  // PostgREST GET responses (table data fetched by server components)
  {
    matcher: ({ url, request }) =>
      url.hostname.endsWith("supabase.co") &&
      url.pathname.startsWith("/rest/v1/") &&
      request.method === "GET",
    handler: new NetworkFirst({
      cacheName: "supabase-postgrest",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 128,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        }),
      ],
      networkTimeoutSeconds: 5,
    }),
  },
  // Storage public GET responses (photos, files)
  {
    matcher: ({ url, request }) =>
      url.hostname.endsWith("supabase.co") &&
      url.pathname.startsWith("/storage/v1/object/public/") &&
      request.method === "GET",
    handler: new CacheFirst({
      cacheName: "supabase-storage-public",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 256,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        }),
      ],
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...supabaseCache, ...defaultCache],
});

// Clear PostgREST cache on sign-out to prevent cross-user data leakage
self.addEventListener("message", (event) => {
  if (event.data?.type === "CLEAR_AUTH_CACHE") {
    caches.delete("supabase-postgrest").then(() => {
      console.log("[SW] Cleared PostgREST cache on auth change");
    });
  }
});

// ── Push Notifications ──
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json() as {
      title?: string;
      body?: string;
      url?: string;
      icon?: string;
      tag?: string;
    };

    const title = payload.title || "Asset Atlas";
    const options: NotificationOptions & { vibrate?: number[]; renotify?: boolean } = {
      body: payload.body || "",
      icon: payload.icon || "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      tag: payload.tag || "default",
      data: { url: payload.url || "/" },
      vibrate: [100, 50, 100],
      renotify: true,
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error("[SW] Push parse error:", err);
  }
});

// Deep-link on notification click → open correct thread/page
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = (event.notification.data?.url as string) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing tab if URL matches
        for (const client of clientList) {
          if (client.url.includes(url) && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open new tab
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});

serwist.addEventListeners();
