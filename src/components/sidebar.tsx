"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { signOut } from "@/app/actions/auth";
import { useTheme } from "@/components/theme-provider";
import { useAppLocale } from "@/components/locale-provider";
import { useOffline } from "@/components/offline-provider";
import type { User } from "@supabase/supabase-js";

function SombreroIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      {/* Brim */}
      <ellipse cx="12" cy="17" rx="10" ry="3" />
      {/* Crown */}
      <path d="M7 17c0-3 1.5-7 5-7s5 4 5 7" />
      {/* Top */}
      <path d="M9.5 12c0-1.5 1-3 2.5-3s2.5 1.5 2.5 3" />
    </svg>
  );
}

export function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const t = useTranslations();
  const { theme, toggleTheme } = useTheme();
  const { locale, toggleLocale } = useAppLocale();
  const { isFieldMode, isOnline, pendingCount, isSyncing, stuckCount, toggleFieldMode, startSync, resetStuck } = useOffline();
  const [isOpen, setIsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { href: "/dashboard", label: t("nav.home"), icon: "", matchPaths: ["/dashboard"] },
    { href: "/projects", label: t("nav.dueDiligence"), icon: "", matchPaths: ["/projects"] },
    { href: "/inspections", label: t("nav.inspections"), icon: "", matchPaths: ["/inspections"] },
    { href: "/unit-turns", label: t("nav.unitTurns"), icon: "", matchPaths: ["/unit-turns"] },
    { href: "/deal-analysis", label: t("nav.dealAnalysis"), icon: "", matchPaths: ["/deal-analysis"] },
  ];

  // Close mobile drawer on navigation
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Close on escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    if (isOpen) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen]);

  return (
    <>
      {/* Mobile hamburger button — visible only on small screens */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed left-3 z-50 p-2 bg-surface-primary rounded-lg border border-edge-primary shadow-sm"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
        aria-label={t("sidebar.openMenu")}
      >
        <svg className="w-5 h-5 text-content-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/30 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`bg-surface-primary border-r border-edge-primary flex flex-col flex-shrink-0 transition-all duration-200 fixed inset-y-0 left-0 z-50 ${isOpen ? "translate-x-0" : "-translate-x-full"} w-64 md:relative md:translate-x-0 ${collapsed ? "md:w-16" : "md:w-64"}`}
      >
        {/* Header — charcoal + forest green */}
        <div
          className="p-4 flex items-center justify-between bg-[radial-gradient(ellipse_at_top_left,_var(--brand-900)_0%,_transparent_50%),radial-gradient(ellipse_at_bottom_right,_var(--brand-900)_0%,_var(--charcoal-950)_60%)] bg-charcoal-900"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
        >
          {!collapsed && (
            <Link href="/dashboard" className="flex-shrink-0">
              <div>
                <h1 className="text-xl font-bold text-white leading-tight">Asset <span className="text-brand-500">Atlas</span> Pro</h1>
                <p className="text-sm text-gold-400">{t("sidebar.tagline")}</p>
              </div>
            </Link>
          )}

          {/* Desktop collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex p-1.5 text-charcoal-400 hover:text-white hover:bg-charcoal-700 rounded transition-colors"
            aria-label={collapsed ? t("sidebar.expandSidebar") : t("sidebar.collapseSidebar")}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {collapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
              )}
            </svg>
          </button>

          {/* Mobile close button */}
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden p-1.5 text-charcoal-400 hover:text-white"
            aria-label={t("sidebar.closeMenu")}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = item.matchPaths.some(
              (p) => pathname === p || pathname.startsWith(p + "/")
            );

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-brand-50 text-brand-700 shadow-sm border border-brand-100"
                    : "text-content-tertiary hover:bg-surface-secondary hover:text-content-primary"
                } ${collapsed ? "md:justify-center md:px-0" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                {item.icon && <span className="text-base">{item.icon}</span>}
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Field Mode + Language + Theme toggle + User info + sign out */}
        <div className="p-4 border-t border-edge-primary bg-surface-secondary/50">
          {/* Field Mode toggle */}
          {!collapsed ? (
            <button
              onClick={toggleFieldMode}
              className={`flex items-center justify-between w-full px-1 py-1.5 text-sm rounded transition-colors mb-2 ${
                isFieldMode
                  ? "text-gold-400 font-medium"
                  : "text-content-tertiary hover:text-content-primary"
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                </svg>
                {isFieldMode ? t("sidebar.goOnline") : t("sidebar.fieldMode")}
              </span>
              <span className="flex items-center gap-1.5">
                {pendingCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full bg-gold-500/20 text-gold-400">
                    {pendingCount}
                  </span>
                )}
                {!isOnline && (
                  <span className="w-2 h-2 rounded-full bg-red-500" title={t("sidebar.offline")} />
                )}
              </span>
            </button>
          ) : (
            <button
              onClick={toggleFieldMode}
              className={`w-full text-center py-1.5 text-base mb-2 relative ${isFieldMode ? "text-gold-400" : ""}`}
              title={isFieldMode ? t("sidebar.goOnline") : t("sidebar.fieldMode")}
            >
              <svg className="w-4 h-4 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
              </svg>
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] font-bold rounded-full bg-gold-500/20 text-gold-400 flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
          )}

          {/* Sync button — shows when there are pending items and we're online */}
          {pendingCount > 0 && isOnline && !isFieldMode && !isSyncing && !collapsed && (
            <button
              onClick={() => startSync()}
              className="flex items-center justify-center gap-2 w-full px-1 py-1.5 text-sm text-brand-400 hover:text-brand-300 rounded transition-colors mb-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {t("sidebar.syncNow")}
            </button>
          )}

          {isSyncing && !collapsed && (
            <p className="text-xs text-brand-400 mb-2 px-1">{t("sidebar.syncing")}</p>
          )}

          {/* Retry stuck items — shows when items have failed max retries */}
          {stuckCount > 0 && isOnline && !isSyncing && !collapsed && (
            <button
              onClick={() => resetStuck()}
              className="flex items-center justify-center gap-2 w-full px-1 py-1.5 text-sm text-red-400 hover:text-red-300 rounded transition-colors mb-2 bg-red-500/10"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {t("sidebar.retryFailed", { count: stuckCount })}
            </button>
          )}

          {/* Language toggle — sombrero icon */}
          {!collapsed ? (
            <button
              onClick={toggleLocale}
              className="flex items-center justify-between w-full px-1 py-1.5 text-sm text-content-tertiary hover:text-content-primary rounded transition-colors mb-2"
            >
              <span>{locale === "en" ? t("sidebar.switchToSpanish") : t("sidebar.switchToEnglish")}</span>
              <SombreroIcon className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={toggleLocale}
              className="w-full text-center py-1.5 mb-2 text-content-tertiary hover:text-content-primary"
              title={locale === "en" ? t("sidebar.switchToSpanish") : t("sidebar.switchToEnglish")}
            >
              <SombreroIcon className="w-5 h-5 mx-auto" />
            </button>
          )}

          {/* Theme toggle */}
          {!collapsed ? (
            <button
              onClick={toggleTheme}
              className="flex items-center justify-between w-full px-1 py-1.5 text-sm text-content-tertiary hover:text-content-primary rounded transition-colors mb-2"
            >
              <span>{theme === "dark" ? t("sidebar.lightMode") : t("sidebar.darkMode")}</span>
              <span className="text-base">{theme === "dark" ? "\u2600\uFE0F" : "\uD83C\uDF19"}</span>
            </button>
          ) : (
            <button
              onClick={toggleTheme}
              className="w-full text-center py-1.5 text-base mb-2"
              title={theme === "dark" ? t("sidebar.switchToLight") : t("sidebar.switchToDark")}
            >
              {theme === "dark" ? "\u2600\uFE0F" : "\uD83C\uDF19"}
            </button>
          )}

          {!collapsed && (
            <p className="text-sm text-content-tertiary truncate mb-2">{user.email}</p>
          )}
          <form action={signOut} onSubmit={() => {
            // Clear service worker cache to prevent cross-user data leakage
            if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({ type: "CLEAR_AUTH_CACHE" });
            }
          }}>
            <button
              type="submit"
              className={`text-sm text-red-500 hover:text-red-700 font-medium transition-colors ${
                collapsed ? "w-full text-center" : "w-full text-left"
              }`}
              title={collapsed ? t("sidebar.signOut") : undefined}
            >
              {collapsed ? (
                <span className="text-xs">Out</span>
              ) : (
                t("sidebar.signOut")
              )}
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
