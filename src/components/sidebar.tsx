"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import { useTheme } from "@/components/theme-provider";
import { useOffline } from "@/components/offline-provider";
import type { User } from "@supabase/supabase-js";

const navItems = [
  {
    href: "/dashboard",
    label: "Home",
    icon: "",
    matchPaths: ["/dashboard"],
  },
  {
    href: "/projects",
    label: "Due Diligence",
    icon: "",
    matchPaths: ["/projects"],
  },
  {
    href: "/inspections",
    label: "Inspections",
    icon: "",
    matchPaths: ["/inspections"],
  },
  {
    href: "/unit-turns",
    label: "Unit Turns",
    icon: "",
    matchPaths: ["/unit-turns"],
  },
];

export function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { isFieldMode, isOnline, pendingCount, isSyncing, toggleFieldMode, startSync } = useOffline();
  const [isOpen, setIsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

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
        className="md:hidden fixed top-3 left-3 z-50 p-2 bg-surface-primary rounded-lg border border-edge-primary shadow-sm"
        aria-label="Open menu"
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
        <div className="p-4 flex items-center justify-between bg-[radial-gradient(ellipse_at_top_left,_var(--brand-900)_0%,_transparent_50%),radial-gradient(ellipse_at_bottom_right,_var(--brand-900)_0%,_var(--charcoal-950)_60%)] bg-charcoal-900">
          {!collapsed && (
            <Link href="/dashboard" className="flex-shrink-0">
              <div>
                <h1 className="text-xl font-bold text-white leading-tight">Asset <span className="text-brand-500">Atlas</span> Pro</h1>
                <p className="text-sm text-gold-400">See Risk. Plan Capital.</p>
              </div>
            </Link>
          )}

          {/* Desktop collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex p-1.5 text-charcoal-400 hover:text-white hover:bg-charcoal-700 rounded transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
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
            aria-label="Close menu"
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

        {/* Field Mode + Theme toggle + User info + sign out */}
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
                {isFieldMode ? "Go Online" : "Field Mode"}
              </span>
              <span className="flex items-center gap-1.5">
                {pendingCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full bg-gold-500/20 text-gold-400">
                    {pendingCount}
                  </span>
                )}
                {!isOnline && (
                  <span className="w-2 h-2 rounded-full bg-red-500" title="Offline" />
                )}
              </span>
            </button>
          ) : (
            <button
              onClick={toggleFieldMode}
              className={`w-full text-center py-1.5 text-base mb-2 relative ${isFieldMode ? "text-gold-400" : ""}`}
              title={isFieldMode ? "Go Online" : "Field Mode"}
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
              Sync Now
            </button>
          )}

          {isSyncing && !collapsed && (
            <p className="text-xs text-brand-400 mb-2 px-1">Syncing...</p>
          )}

          {/* Theme toggle */}
          {!collapsed ? (
            <button
              onClick={toggleTheme}
              className="flex items-center justify-between w-full px-1 py-1.5 text-sm text-content-tertiary hover:text-content-primary rounded transition-colors mb-2"
            >
              <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
              <span className="text-base">{theme === "dark" ? "\u2600\uFE0F" : "\uD83C\uDF19"}</span>
            </button>
          ) : (
            <button
              onClick={toggleTheme}
              className="w-full text-center py-1.5 text-base mb-2"
              title={theme === "dark" ? "Switch to Light" : "Switch to Dark"}
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
              title={collapsed ? "Sign Out" : undefined}
            >
              {collapsed ? (
                <span className="text-xs">Out</span>
              ) : (
                "Sign Out"
              )}
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
