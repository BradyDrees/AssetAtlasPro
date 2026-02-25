"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { signOut } from "@/app/actions/auth";
import { useTheme } from "@/components/theme-provider";
import { useAppLocale } from "@/components/locale-provider";
import { useOffline } from "@/components/offline-provider";
import { NotificationBell } from "@/components/vendor/notification-bell";
import { TierSwitcher } from "@/components/tier-switcher";
import type { User } from "@supabase/supabase-js";

function SombreroIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="17" rx="10" ry="3" />
      <path d="M7 17c0-3 1.5-7 5-7s5 4 5 7" />
      <path d="M9.5 12c0-1.5 1-3 2.5-3s2.5 1.5 2.5 3" />
    </svg>
  );
}

interface OperateSidebarProps {
  user: User;
  hasVendorRole?: boolean;
  hasOwnerRole?: boolean;
}

export function OperateSidebar({ user, hasVendorRole = false, hasOwnerRole = false }: OperateSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations();
  const { theme, toggleTheme } = useTheme();
  const { locale, toggleLocale } = useAppLocale();
  const { isFieldMode, isOnline, pendingCount, isSyncing, stuckCount, toggleFieldMode, startSync, resetStuck } = useOffline();
  const [isOpen, setIsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const ic = "w-5 h-5 flex-shrink-0";
  const navItems = [
    { href: "/operate/dashboard", label: t("nav.home"), matchPaths: ["/operate/dashboard"], icon: (
      <svg className={ic} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    )},
    { href: "/operate/inspections", label: t("nav.inspections"), matchPaths: ["/operate/inspections"], icon: (
      <svg className={ic} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    )},
    { href: "/operate/unit-turns", label: t("nav.unitTurns"), matchPaths: ["/operate/unit-turns"], icon: (
      <svg className={ic} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
      </svg>
    )},
    { href: "/operate/work-orders", label: t("nav.workOrders"), matchPaths: ["/operate/work-orders"], icon: (
      <svg className={ic} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.384 3.324a.75.75 0 01-1.15-.79l1.27-6.077-4.6-4.065a.75.75 0 01.416-1.28l6.24-.665L11.013.309a.75.75 0 01.064-.064M11.42 15.17l2.496-2.496" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75a4.5 4.5 0 01-4.5 4.5m4.5-4.5a4.5 4.5 0 00-4.5-4.5m4.5 4.5h-4.5m0 0V2.25" />
      </svg>
    )},
    { href: "/operate/vendors", label: t("nav.vendors"), matchPaths: ["/operate/vendors"], icon: (
      <svg className={ic} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    )},
    { href: "/operate/estimates", label: t("nav.estimates"), matchPaths: ["/operate/estimates"], icon: (
      <svg className={ic} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
      </svg>
    )},
    { href: "/operate/invoices", label: t("nav.invoices"), matchPaths: ["/operate/invoices"], icon: (
      <svg className={ic} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    )},
  ];

  useEffect(() => { setIsOpen(false); }, [pathname]);
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false); };
    if (isOpen) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen]);

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="md:hidden fixed left-3 z-50 p-2 bg-surface-primary rounded-lg border border-edge-primary shadow-sm" style={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }} aria-label={t("sidebar.openMenu")}>
        <svg className="w-5 h-5 text-content-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>

      {isOpen && <div className="md:hidden fixed inset-0 bg-black/30 z-40" onClick={() => setIsOpen(false)} />}

      <aside className={`bg-surface-primary border-r border-edge-primary flex flex-col flex-shrink-0 transition-all duration-200 fixed inset-y-0 left-0 z-50 ${isOpen ? "translate-x-0" : "-translate-x-full"} w-64 md:relative md:translate-x-0 ${collapsed ? "md:w-16" : "md:w-64"}`}>
        <div className="p-4 flex items-center justify-between bg-[radial-gradient(ellipse_at_top_left,_var(--color-green-900)_0%,_transparent_50%),radial-gradient(ellipse_at_bottom_right,_var(--color-green-900)_0%,_var(--charcoal-950)_60%)] bg-charcoal-900" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}>
          {!collapsed && (
            <Link href="/operate/dashboard" className="flex-shrink-0">
              <div>
                <h1 className="text-xl font-bold text-white leading-tight">Atlas <span className="text-green-400">Operate</span></h1>
                <p className="text-sm text-green-300/70">{t("tiers.operateTagline")}</p>
              </div>
            </Link>
          )}
          <button onClick={() => setCollapsed(!collapsed)} className="hidden md:flex p-1.5 text-charcoal-400 hover:text-white hover:bg-charcoal-700 rounded transition-colors" aria-label={collapsed ? t("sidebar.expandSidebar") : t("sidebar.collapseSidebar")}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {collapsed ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />}
            </svg>
          </button>
          <button onClick={() => setIsOpen(false)} className="md:hidden p-1.5 text-charcoal-400 hover:text-white" aria-label={t("sidebar.closeMenu")}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className={`px-3 pt-2 flex ${collapsed ? "justify-center" : "justify-end"}`}>
          <NotificationBell namespace="sidebar" />
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = item.matchPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive ? "bg-green-50 text-green-700 shadow-sm border border-green-100" : "text-content-tertiary hover:bg-surface-secondary hover:text-content-primary"} ${collapsed ? "md:justify-center md:px-0" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                {item.icon && <span className="text-current">{item.icon}</span>}
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-edge-primary bg-surface-secondary/50">
          {!collapsed ? (
            <button onClick={toggleFieldMode} className={`flex items-center justify-between w-full px-1 py-1.5 text-sm rounded transition-colors mb-2 ${isFieldMode ? "text-gold-400 font-medium" : "text-content-tertiary hover:text-content-primary"}`}>
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" /></svg>
                {isFieldMode ? t("sidebar.goOnline") : t("sidebar.fieldMode")}
              </span>
              <span className="flex items-center gap-1.5">
                {pendingCount > 0 && <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full bg-gold-500/20 text-gold-400">{pendingCount}</span>}
                {!isOnline && <span className="w-2 h-2 rounded-full bg-red-500" title={t("sidebar.offline")} />}
              </span>
            </button>
          ) : (
            <button onClick={toggleFieldMode} className={`w-full text-center py-1.5 text-base mb-2 relative ${isFieldMode ? "text-gold-400" : ""}`} title={isFieldMode ? t("sidebar.goOnline") : t("sidebar.fieldMode")}>
              <svg className="w-4 h-4 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" /></svg>
              {pendingCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] font-bold rounded-full bg-gold-500/20 text-gold-400 flex items-center justify-center">{pendingCount}</span>}
            </button>
          )}

          {pendingCount > 0 && isOnline && !isFieldMode && !isSyncing && !collapsed && (
            <button onClick={() => startSync()} className="flex items-center justify-center gap-2 w-full px-1 py-1.5 text-sm text-brand-400 hover:text-brand-300 rounded transition-colors mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              {t("sidebar.syncNow")}
            </button>
          )}
          {isSyncing && !collapsed && <p className="text-xs text-brand-400 mb-2 px-1">{t("sidebar.syncing")}</p>}
          {stuckCount > 0 && isOnline && !isSyncing && !collapsed && (
            <button onClick={() => resetStuck()} className="flex items-center justify-center gap-2 w-full px-1 py-1.5 text-sm text-red-400 hover:text-red-300 rounded transition-colors mb-2 bg-red-500/10">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              {t("sidebar.retryFailed", { count: stuckCount })}
            </button>
          )}

          <TierSwitcher currentTier="operate" hasPmRole={true} hasVendorRole={hasVendorRole} hasOwnerRole={hasOwnerRole} collapsed={collapsed} />

          {!collapsed ? (
            <button onClick={toggleLocale} className="flex items-center justify-between w-full px-1 py-1.5 text-sm text-content-tertiary hover:text-content-primary rounded transition-colors mb-2 mt-2">
              <span>{locale === "en" ? t("sidebar.switchToSpanish") : t("sidebar.switchToEnglish")}</span>
              <SombreroIcon className="w-5 h-5" />
            </button>
          ) : (
            <button onClick={toggleLocale} className="w-full text-center py-1.5 mb-2 mt-2 text-content-tertiary hover:text-content-primary" title={locale === "en" ? t("sidebar.switchToSpanish") : t("sidebar.switchToEnglish")}>
              <SombreroIcon className="w-5 h-5 mx-auto" />
            </button>
          )}

          {!collapsed ? (
            <button onClick={toggleTheme} className="flex items-center justify-between w-full px-1 py-1.5 text-sm text-content-tertiary hover:text-content-primary rounded transition-colors mb-2">
              <span>{theme === "dark" ? t("sidebar.lightMode") : t("sidebar.darkMode")}</span>
              <span className="text-base">{theme === "dark" ? "\u2600\uFE0F" : "\uD83C\uDF19"}</span>
            </button>
          ) : (
            <button onClick={toggleTheme} className="w-full text-center py-1.5 text-base mb-2" title={theme === "dark" ? t("sidebar.switchToLight") : t("sidebar.switchToDark")}>
              {theme === "dark" ? "\u2600\uFE0F" : "\uD83C\uDF19"}
            </button>
          )}

          {!collapsed && <p className="text-sm text-content-tertiary truncate mb-2">{user.email}</p>}
          <form action={signOut} onSubmit={() => {
            if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({ type: "CLEAR_AUTH_CACHE" });
            }
          }}>
            <button type="submit" className={`text-sm text-red-500 hover:text-red-700 font-medium transition-colors ${collapsed ? "w-full text-center" : "w-full text-left"}`} title={collapsed ? t("sidebar.signOut") : undefined}>
              {collapsed ? <span className="text-xs">Out</span> : t("sidebar.signOut")}
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
