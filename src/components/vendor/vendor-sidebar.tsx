"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { signOut } from "@/app/actions/auth";
import { switchRole } from "@/app/actions/switch-role";
import { useTheme } from "@/components/theme-provider";
import { useAppLocale } from "@/components/locale-provider";
import { useOffline } from "@/components/offline-provider";
import type { User } from "@supabase/supabase-js";
import type { VendorOrgRole } from "@/lib/vendor/types";
import { NotificationBell } from "./notification-bell";
import { UnreadBadge } from "@/components/messaging/unread-badge";

function SombreroIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="17" rx="10" ry="3" />
      <path d="M7 17c0-3 1.5-7 5-7s5 4 5 7" />
      <path d="M9.5 12c0-1.5 1-3 2.5-3s2.5 1.5 2.5 3" />
    </svg>
  );
}

// SVG icons for vendor nav items
function HomeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

function CalculatorIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function ChartBarIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function AgreementsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
    </svg>
  );
}

function BanknotesIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  );
}

function UserCircleIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
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

function PricebookIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  );
}

function TemplatesIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15h6m-6-3h6" />
    </svg>
  );
}

function InventoryIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
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

function PhoneIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
    </svg>
  );
}

// Team icon
function TeamIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  );
}

interface VendorSidebarProps {
  user: User;
  hasPmRole?: boolean;
  vendorRole?: VendorOrgRole;
}

const VIEW_AS_ROLES: VendorOrgRole[] = ["owner", "admin", "office_manager", "tech"];
const VIEW_AS_LABELS: Record<VendorOrgRole, string> = {
  owner: "Owner",
  admin: "Admin",
  office_manager: "Office Mgr",
  tech: "Tech",
};

export function VendorSidebar({ user, hasPmRole = false, vendorRole = "owner" }: VendorSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations();
  const vt = useTranslations("vendor.nav");
  const { theme, toggleTheme } = useTheme();
  const { locale, toggleLocale } = useAppLocale();
  const { isFieldMode, isOnline, pendingCount, isSyncing, stuckCount, toggleFieldMode, startSync, resetStuck } = useOffline();
  const [isOpen, setIsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // "View As" role preview — only for owners/admins
  const isOwnerOrAdmin = vendorRole === "owner" || vendorRole === "admin";
  const [viewAsRole, setViewAsRole] = useState<VendorOrgRole>(vendorRole);
  const [showViewAs, setShowViewAs] = useState(false);

  const effectiveRole = isOwnerOrAdmin ? viewAsRole : vendorRole;
  const isTech = effectiveRole === "tech";
  const isOfficeMgr = effectiveRole === "office_manager";

  // Role-based nav items
  const navItems = isTech
    ? [
        { href: "/vendor/schedule", label: vt("mySchedule"), icon: <CalendarIcon />, matchExact: false },
        { href: "/vendor/jobs", label: vt("myJobs"), icon: <BriefcaseIcon />, matchExact: false },
        { href: "/vendor/inbox", label: vt("messages"), icon: <ChatBubbleIcon />, matchExact: false, showUnreadBadge: true },
        { href: "/vendor/profile", label: vt("profile"), icon: <UserCircleIcon />, matchExact: false },
      ]
    : isOfficeMgr
      ? [
          { href: "/vendor", label: vt("home"), icon: <HomeIcon />, matchExact: true },
          { href: "/vendor/jobs", label: vt("jobs"), icon: <BriefcaseIcon />, matchExact: false },
          { href: "/vendor/schedule", label: vt("schedule"), icon: <CalendarIcon />, matchExact: false },
          { href: "/vendor/team", label: vt("team"), icon: <TeamIcon />, matchExact: false },
          { href: "/vendor/inbox", label: vt("messages"), icon: <ChatBubbleIcon />, matchExact: false, showUnreadBadge: true },
          { href: "/vendor/profile", label: vt("profile"), icon: <UserCircleIcon />, matchExact: false },
        ]
      : [
          // Owner/Admin — full nav
          { href: "/vendor", label: vt("home"), icon: <HomeIcon />, matchExact: true },
          { href: "/vendor/jobs", label: vt("jobs"), icon: <BriefcaseIcon />, matchExact: false },
          { href: "/vendor/schedule", label: vt("schedule"), icon: <CalendarIcon />, matchExact: false },
          { href: "/vendor/estimates", label: vt("estimates"), icon: <CalculatorIcon />, matchExact: true },
          { href: "/vendor/estimates/pricebook", label: vt("pricebook"), icon: <PricebookIcon />, matchExact: false },
          { href: "/vendor/estimates/templates", label: vt("templates"), icon: <TemplatesIcon />, matchExact: false },
          { href: "/vendor/invoices", label: vt("invoices"), icon: <ReceiptIcon />, matchExact: true },
          { href: "/vendor/invoices/recurring", label: vt("recurring"), icon: <ReceiptIcon />, matchExact: false },
          { href: "/vendor/agreements", label: vt("agreements"), icon: <AgreementsIcon />, matchExact: false },
          { href: "/vendor/clients", label: vt("clients"), icon: <UsersIcon />, matchExact: false },
          { href: "/vendor/reviews", label: vt("reviews"), icon: <StarIcon />, matchExact: false },
          { href: "/vendor/reports", label: vt("reports"), icon: <ChartBarIcon />, matchExact: false },
          { href: "/vendor/expenses", label: vt("expenses"), icon: <BanknotesIcon />, matchExact: false },
          { href: "/vendor/inventory", label: vt("inventory"), icon: <InventoryIcon />, matchExact: false },
          { href: "/vendor/team", label: vt("team"), icon: <TeamIcon />, matchExact: false },
          { href: "/vendor/inbox", label: vt("messages"), icon: <ChatBubbleIcon />, matchExact: false, showUnreadBadge: true },
          { href: "/vendor/messages", label: vt("sms"), icon: <PhoneIcon />, matchExact: false },
          { href: "/vendor/profile", label: vt("profile"), icon: <UserCircleIcon />, matchExact: false },
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
        {/* Header */}
        <div
          className="p-4 flex items-center justify-between bg-[radial-gradient(ellipse_at_top_left,_var(--brand-900)_0%,_transparent_50%),radial-gradient(ellipse_at_bottom_right,_var(--brand-900)_0%,_var(--charcoal-950)_60%)] bg-charcoal-900"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
        >
          {!collapsed && (
            <Link href="/vendor" className="flex-shrink-0">
              <div>
                <h1 className="text-xl font-bold text-white leading-tight">Asset <span className="text-brand-500">Atlas</span> Pro</h1>
                <p className="text-sm text-gold-400">{vt("vendorPortal")}</p>
              </div>
            </Link>
          )}

          {/* Notification bell + Desktop collapse toggle */}
          <div className="flex items-center gap-1">
            {!collapsed && <NotificationBell />}
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
            aria-label={t("sidebar.closeMenu")}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* View As role preview — owner/admin only */}
        {isOwnerOrAdmin && !collapsed && (
          <div className="px-3 pt-2 relative">
            <button
              onClick={() => setShowViewAs(!showViewAs)}
              className={`flex items-center justify-between w-full px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                viewAsRole !== vendorRole
                  ? "bg-gold-500/10 border-gold-500/30 text-gold-400"
                  : "bg-surface-secondary border-edge-secondary text-content-tertiary hover:text-content-primary"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {viewAsRole !== vendorRole
                  ? `${vt("viewingAs")} ${VIEW_AS_LABELS[viewAsRole]}`
                  : vt("viewAs")}
              </span>
              <svg className={`w-3 h-3 transition-transform ${showViewAs ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {showViewAs && (
              <div className="absolute left-3 right-3 top-full mt-1 bg-surface-primary rounded-lg border border-edge-primary shadow-lg z-50 py-1">
                {VIEW_AS_ROLES.map((role) => (
                  <button
                    key={role}
                    onClick={() => { setViewAsRole(role); setShowViewAs(false); }}
                    className={`flex items-center justify-between w-full px-3 py-1.5 text-xs transition-colors ${
                      viewAsRole === role
                        ? "text-brand-400 bg-brand-500/10"
                        : "text-content-secondary hover:bg-surface-secondary"
                    }`}
                  >
                    <span>{VIEW_AS_LABELS[role]}</span>
                    {role === vendorRole && (
                      <span className="text-[10px] text-content-quaternary">({vt("yourRole")})</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

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
                    ? "bg-brand-50 text-brand-700 shadow-sm border border-brand-100"
                    : "text-content-tertiary hover:bg-surface-secondary hover:text-content-primary"
                } ${collapsed ? "md:justify-center md:px-0" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <span className="relative">
                  {item.icon}
                  {item.showUnreadBadge && <UnreadBadge className="bg-brand-600" />}
                </span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
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

          {/* Sync button */}
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

          {/* Role switcher — only if user also has PM role */}
          {hasPmRole && !collapsed && (
            <button
              onClick={async () => {
                await switchRole("pm");
                document.cookie = "active_role=pm; path=/; max-age=31536000; samesite=lax";
                window.location.href = "/acquire/dashboard";
              }}
              className="flex items-center gap-2 w-full px-1 py-1.5 text-sm text-content-tertiary hover:text-content-primary rounded transition-colors mb-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
              {vt("switchToPm")}
            </button>
          )}

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
          <form action={signOut} onSubmit={() => {
            if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({ type: "CLEAR_AUTH_CACHE" });
            }
          }}>
            <button
              type="submit"
              className={`text-sm text-red-500 hover:text-red-700 font-medium transition-colors ${
                collapsed ? "w-full text-center" : "w-full text-left"
              }`}
              title={collapsed ? vt("signOut") : undefined}
            >
              {collapsed ? (
                <span className="text-xs">Out</span>
              ) : (
                vt("signOut")
              )}
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
