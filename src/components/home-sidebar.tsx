"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { signOut } from "@/app/actions/auth";
import { useTheme } from "@/components/theme-provider";
import { useAppLocale } from "@/components/locale-provider";
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

// Nav icons
function DashboardIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  );
}

function ChatBubbleIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" />
    </svg>
  );
}

function CogIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

interface HomeSidebarProps {
  user: User;
  hasVendorRole?: boolean;
  hasPmRole?: boolean;
}

export function HomeSidebar({ user, hasVendorRole = false, hasPmRole = false }: HomeSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations();
  const ht = useTranslations("home.nav");
  const { theme, toggleTheme } = useTheme();
  const { locale, toggleLocale } = useAppLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { href: "/home/dashboard", label: ht("dashboard"), icon: <DashboardIcon />, matchExact: true },
    { href: "/home/work-orders", label: ht("workOrders"), icon: <WrenchIcon />, matchExact: false },
    { href: "/home/vendors", label: ht("vendors"), icon: <StarIcon />, matchExact: false },
    { href: "/home/messages", label: ht("messages"), icon: <ChatBubbleIcon />, matchExact: false },
    { href: "/home/property", label: ht("property"), icon: <BuildingIcon />, matchExact: false },
    { href: "/home/settings", label: ht("settings"), icon: <CogIcon />, matchExact: false },
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
      {/* Mobile hamburger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed left-3 z-50 p-2 bg-surface-primary rounded-lg border border-edge-primary shadow-sm"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
        aria-label={ht("openMenu")}
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
        {/* Header — rose gradient for Home tier */}
        <div
          className="p-4 flex items-center justify-between bg-[radial-gradient(ellipse_at_top_left,_var(--color-rose-900)_0%,_transparent_50%),radial-gradient(ellipse_at_bottom_right,_var(--color-rose-900)_0%,_var(--charcoal-950)_60%)] bg-charcoal-900"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
        >
          {!collapsed && (
            <Link href="/home/dashboard" className="flex-shrink-0">
              <div>
                <h1 className="text-xl font-bold text-white leading-tight">Atlas <span className="text-rose-400">Home</span></h1>
                <p className="text-sm text-rose-300">{ht("homePortal")}</p>
              </div>
            </Link>
          )}

          {/* Desktop collapse toggle */}
          <div className="flex items-center gap-1">
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
          </div>

          {/* Mobile close button */}
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden p-1.5 text-charcoal-400 hover:text-white"
            aria-label={ht("closeMenu")}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content area — prevents clipping on short viewports / PWA */}
        <div className="flex-1 flex flex-col overflow-y-auto overscroll-contain">
        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = item.matchExact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-rose-50 text-rose-700 shadow-sm border border-rose-100"
                    : "text-content-tertiary hover:bg-surface-secondary hover:text-content-primary"
                } ${collapsed ? "md:justify-center md:px-0" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="p-4 border-t border-edge-primary bg-surface-secondary/50">
          {/* Tier switcher */}
          <TierSwitcher currentTier="home" hasPmRole={hasPmRole} hasVendorRole={hasVendorRole} hasOwnerRole={true} collapsed={collapsed} />

          {/* Language toggle */}
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
          <form action={signOut}>
            <button
              type="submit"
              className={`text-sm text-red-500 hover:text-red-700 font-medium transition-colors ${
                collapsed ? "w-full text-center" : "w-full text-left"
              }`}
              title={collapsed ? ht("signOut") : undefined}
            >
              {collapsed ? (
                <span className="text-xs">Out</span>
              ) : (
                ht("signOut")
              )}
            </button>
          </form>
        </div>
        </div>
      </aside>
    </>
  );
}
