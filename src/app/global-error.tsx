"use client";

/**
 * Root error boundary — catches errors that nested error.tsx files can't,
 * including crashes during root layout rendering (e.g. Dexie IndexedDB
 * initialization failure after PWA reinstall or corrupted storage).
 *
 * Because this replaces the entire root layout, next-intl's provider is not
 * available. We read the locale cookie directly for i18n.
 */

const STRINGS = {
  en: {
    title: "Something went wrong",
    description: "The app encountered an unexpected error. You can try again or clear offline data to start fresh.",
    retry: "Try Again",
    clearData: "Clear Offline Data & Reload",
    hint: "If the error persists, close all other tabs with this site open, then try again.",
  },
  es: {
    title: "Algo salió mal",
    description: "La app encontró un error inesperado. Puedes intentar de nuevo o borrar los datos sin conexión para empezar de nuevo.",
    retry: "Intentar de nuevo",
    clearData: "Borrar datos sin conexión y recargar",
    hint: "Si el error persiste, cierra todas las demás pestañas con este sitio abiertas e inténtalo de nuevo.",
  },
} as const;

function getLocale(): "en" | "es" {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(/(?:^|;\s*)locale=(\w+)/);
  return match?.[1] === "es" ? "es" : "en";
}

async function clearOfflineDataAndReload() {
  try {
    // 1. Unregister all service workers
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
    }

    // 2. Clear all SW caches
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }

    // 3. Clear localStorage & sessionStorage
    try { localStorage.clear(); } catch { /* quota or security error — ignore */ }
    try { sessionStorage.clear(); } catch { /* ignore */ }

    // 4. Delete IndexedDB database
    if ("indexedDB" in window) {
      indexedDB.deleteDatabase("asset-atlas-offline");
    }

    // 5. In-memory singleton resets naturally after page reload (fresh JS context)
  } catch {
    // Best-effort — continue to reload even if cleanup partially fails
  }

  // 6. Hard reload
  window.location.reload();
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = STRINGS[getLocale()];

  return (
    <html>
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif", backgroundColor: "#fafafa" }}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "24px",
          textAlign: "center",
        }}>
          {/* Error icon */}
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            backgroundColor: "#fef2f2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>
            {t.title}
          </h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 8px", maxWidth: 400 }}>
            {t.description}
          </p>
          <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 24px", fontFamily: "monospace", maxWidth: 500, wordBreak: "break-word" }}>
            {error.message}
          </p>

          {/* Retry button */}
          <button
            onClick={reset}
            style={{
              padding: "10px 24px",
              background: "linear-gradient(to right, #16a34a, #15803d)",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: 12,
              boxShadow: "0 1px 3px rgba(22,163,74,0.2)",
            }}
          >
            {t.retry}
          </button>

          {/* Clear data button */}
          <button
            onClick={clearOfflineDataAndReload}
            style={{
              padding: "10px 24px",
              background: "white",
              color: "#dc2626",
              border: "1px solid #fecaca",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              marginBottom: 20,
            }}
          >
            {t.clearData}
          </button>

          {/* Hint */}
          <p style={{ fontSize: 11, color: "#9ca3af", margin: 0, maxWidth: 340 }}>
            {t.hint}
          </p>
        </div>
      </body>
    </html>
  );
}
