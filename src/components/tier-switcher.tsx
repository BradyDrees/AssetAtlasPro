"use client";

import { useTranslations } from "next-intl";
import { switchRole } from "@/app/actions/switch-role";
import type { AppRole } from "@/lib/vendor/types";

type Tier = "acquire" | "operate" | "pro" | "home";

interface TierSwitcherProps {
  currentTier: Tier;
  hasPmRole: boolean;
  hasVendorRole: boolean;
  hasOwnerRole?: boolean;
  collapsed?: boolean;
}

const TIER_CONFIG: Record<Tier, { label: string; color: string; hoverColor: string; bgColor: string; href: string; role: AppRole }> = {
  acquire: {
    label: "Acquire",
    color: "text-blue-400",
    hoverColor: "hover:text-blue-300",
    bgColor: "hover:bg-blue-500/10",
    href: "/acquire/dashboard",
    role: "pm",
  },
  operate: {
    label: "Operate",
    color: "text-green-400",
    hoverColor: "hover:text-green-300",
    bgColor: "hover:bg-green-500/10",
    href: "/operate/dashboard",
    role: "pm",
  },
  pro: {
    label: "Pro",
    color: "text-amber-400",
    hoverColor: "hover:text-amber-300",
    bgColor: "hover:bg-amber-500/10",
    href: "/pro",
    role: "vendor",
  },
  home: {
    label: "Home",
    color: "text-rose-400",
    hoverColor: "hover:text-rose-300",
    bgColor: "hover:bg-rose-500/10",
    href: "/home/dashboard",
    role: "owner",
  },
};

export function TierSwitcher({ currentTier, hasPmRole, hasVendorRole, hasOwnerRole = false, collapsed = false }: TierSwitcherProps) {
  const t = useTranslations();

  // Build list of available tiers (excluding current)
  const availableTiers: Tier[] = [];

  if (currentTier !== "acquire" && hasPmRole) availableTiers.push("acquire");
  if (currentTier !== "operate" && hasPmRole) availableTiers.push("operate");
  if (currentTier !== "pro" && hasVendorRole) availableTiers.push("pro");
  if (currentTier !== "home") availableTiers.push("home");

  if (availableTiers.length === 0) return null;

  const handleSwitch = async (tier: Tier) => {
    const config = TIER_CONFIG[tier];
    await switchRole(config.role);
    document.cookie = `active_role=${config.role}; path=/; max-age=31536000; samesite=lax`;
    window.location.href = config.href;
  };

  if (collapsed) {
    return (
      <div className="space-y-1">
        {availableTiers.map((tier) => {
          const config = TIER_CONFIG[tier];
          return (
            <button
              key={tier}
              onClick={() => handleSwitch(tier)}
              className={`w-full text-center py-1.5 text-xs font-bold ${config.color} ${config.hoverColor} ${config.bgColor} rounded transition-colors`}
              title={t("tiers.switchTo", { tier: config.label })}
            >
              {config.label.charAt(0)}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {availableTiers.map((tier) => {
        const config = TIER_CONFIG[tier];
        return (
          <button
            key={tier}
            onClick={() => handleSwitch(tier)}
            className={`flex items-center gap-2 w-full px-1 py-1.5 text-sm ${config.color} ${config.hoverColor} ${config.bgColor} rounded transition-colors`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
            {t("tiers.switchTo", { tier: config.label })}
          </button>
        );
      })}
    </div>
  );
}
