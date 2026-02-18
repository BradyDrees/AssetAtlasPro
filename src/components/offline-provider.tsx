"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { pendingCount as getPendingCount } from "@/lib/offline/write";
import { processSyncQueue } from "@/lib/offline/sync-manager";

interface OfflineContextValue {
  /** True when the browser reports a network connection */
  isOnline: boolean;
  /** True when the user has manually toggled "Field Mode" */
  isFieldMode: boolean;
  /** Number of items waiting to sync */
  pendingCount: number;
  /** 0-100 progress while syncing, null when idle */
  syncProgress: number | null;
  /** Whether sync is currently running */
  isSyncing: boolean;
  /** Monotonically increasing counter — bumped after each offline write.
   *  Local data hooks re-run when this changes. */
  localRevision: number;
  /** Toggle field mode on/off */
  toggleFieldMode: () => void;
  /** Manually trigger a sync attempt */
  startSync: () => Promise<void>;
  /** Refresh pending count (call after offline writes) */
  refreshPending: () => Promise<void>;
  /** Bump local revision counter — triggers re-render for local data hooks */
  bumpRevision: () => void;
}

const OfflineContext = createContext<OfflineContextValue | null>(null);

export function useOffline(): OfflineContextValue {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error("useOffline must be used inside <OfflineProvider>");
  return ctx;
}

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  // Always init as true to match server — update in useEffect to avoid hydration mismatch
  const [isOnline, setIsOnline] = useState(true);
  const [isFieldMode, setIsFieldMode] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncProgress, setSyncProgress] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [localRevision, setLocalRevision] = useState(0);
  const syncingRef = useRef(false);

  const bumpRevision = useCallback(() => {
    setLocalRevision((r) => r + 1);
  }, []);

  // Sync actual online status on mount + listen for changes
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const refreshPending = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch {
      // Dexie not ready yet — ignore
    }
  }, []);

  // Poll pending count every 5s
  useEffect(() => {
    refreshPending();
    const interval = setInterval(refreshPending, 5000);
    return () => clearInterval(interval);
  }, [refreshPending]);

  const startSync = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setIsSyncing(true);
    setSyncProgress(0);

    try {
      await processSyncQueue((synced, total) => {
        setSyncProgress(total > 0 ? Math.round((synced / total) * 100) : 100);
      });
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
      setSyncProgress(null);
      await refreshPending();
    }
  }, [refreshPending]);

  // Auto-sync when coming back online from field mode
  useEffect(() => {
    if (isOnline && !isFieldMode && pendingCount > 0) {
      startSync();
    }
  }, [isOnline, isFieldMode, pendingCount, startSync]);

  const toggleFieldMode = useCallback(() => {
    setIsFieldMode((prev) => {
      const next = !prev;
      // If turning off field mode and we're online, start syncing
      if (!next && navigator.onLine) {
        setTimeout(() => startSync(), 500);
      }
      return next;
    });
  }, [startSync]);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        isFieldMode,
        pendingCount,
        syncProgress,
        isSyncing,
        localRevision,
        toggleFieldMode,
        startSync,
        refreshPending,
        bumpRevision,
      }}
    >
      {children}
      {/* Sync progress bar at the very top */}
      {isSyncing && syncProgress !== null && (
        <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-charcoal-800">
          <div
            className="h-full bg-brand-500 transition-all duration-300"
            style={{ width: `${syncProgress}%` }}
          />
        </div>
      )}
    </OfflineContext.Provider>
  );
}
