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

const TIER_CONFIG: Record<Tier, { label: string; short: string; color: string; bgActive: string; bgHover: string; dotColor: string; href: string; role: AppRole }> = {
  acquire: {
    label: "Acquire",
    short: "A",
    color: "text-blue-400",
    bgActive: "bg-blue-500/20 border-blue-500/30",
    bgHover: "hover:bg-blue-500/10",
    dotColor: "bg-blue-400",
    href: "/acquire/dashboard",
    role: "pm",
  },
  operate: {
    label: "Operate",
    short: "O",
    color: "text-green-400",
    bgActive: "bg-green-500/20 border-green-500/30",
    bgHover: "hover:bg-green-500/10",
    dotColor: "bg-green-400",
    href: "/operate/dashboard",
    role: "pm",
  },
  pro: {
    label: "Pro",
    short: "P",
    color: "text-amber-400",
    bgActive: "bg-amber-500/20 border-amber-500/30",
    bgHover: "hover:bg-amber-500/10",
    dotColor: "bg-amber-400",
    href: "/pro",
    role: "vendor",
  },
  home: {
    label: "Home",
    short: "H",
    color: "text-rose-400",
    bgActive: "bg-rose-500/20 border-rose-500/30",
    bgHover: "hover:bg-rose-500/10",
    dotColor: "bg-rose-400",
    href: "/home/dashboard",
    role: "owner",
  },
};

export function TierSwitcher({ currentTier, hasPmRole, hasVendorRole, hasOwnerRole = false, collapsed = false }: TierSwitcherProps) {
  const t = useTranslations();

  // Build full tier list (including current for visual context)
  const allTiers: Tier[] = [];
  if (hasPmRole) { allTiers.push("acquire"); allTiers.push("operate"); }
  if (hasVendorRole) allTiers.push("pro");
  allTiers.push("home");

  if (allTiers.length <= 1) return null;

  const handleSwitch = async (tier: Tier) => {
    if (tier === currentTier) return;
    const config = TIER_CONFIG[tier];
    await switchRole(config.role);
    document.cookie = `active_role=${config.role}; path=/; max-age=31536000; samesite=lax`;
    window.location.href = config.href;
  };

  if (collapsed) {
    return (
      <div className="flex flex-col gap-1 mb-2">
        {allTiers.map((tier) => {
          const config = TIER_CONFIG[tier];
          const isCurrent = tier === currentTier;
          return (
            <button
              key={tier}
              onClick={() => handleSwitch(tier)}
              disabled={isCurrent}
              className={`w-full text-center py-2.5 text-xs font-bold rounded transition-colors min-h-[44px] ${
                isCurrent
                  ? `${config.bgActive} ${config.color} border`
                  : `${config.color} ${config.bgHover}`
              }`}
              title={isCurrent ? config.label : t("tiers.switchTo", { tier: config.label })}
            >
              {config.short}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="mb-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-content-quaternary mb-1.5 px-1">
        {t("tiers.modules")}
      </p>
      <div className="flex flex-wrap gap-1">
        {allTiers.map((tier) => {
          const config = TIER_CONFIG[tier];
          const isCurrent = tier === currentTier;
          return (
            <button
              key={tier}
              onClick={() => handleSwitch(tier)}
              disabled={isCurrent}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors min-h-[44px] ${
                isCurrent
                  ? `${config.bgActive} ${config.color} border cursor-default`
                  : `${config.color} ${config.bgHover} border border-transparent`
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${config.dotColor} ${isCurrent ? "" : "opacity-50"}`} />
              {config.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
