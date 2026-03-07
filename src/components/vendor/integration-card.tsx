"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { triggerSync } from "@/app/actions/vendor-integrations";
import type { VendorIntegration } from "@/lib/integrations/qbo-types";

interface IntegrationCardProps {
  integration?: VendorIntegration | null;
  provider: "quickbooks" | "xero" | "stripe_connect";
  configured: boolean;
}

const PROVIDER_INFO = {
  quickbooks: { name: "QuickBooks Online", icon: "📗", connectPath: "/api/integrations/qbo/connect", disconnectPath: "/api/integrations/qbo/disconnect" },
  xero: { name: "Xero", icon: "🔵", connectPath: "", disconnectPath: "" },
  stripe_connect: { name: "Stripe Connect", icon: "💳", connectPath: "", disconnectPath: "" },
};

export function IntegrationCard({ integration, provider, configured }: IntegrationCardProps) {
  const t = useTranslations("vendor.integrations");
  const info = PROVIDER_INFO[provider];

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const isConnected = integration?.is_active === true;

  async function handleSync() {
    if (!integration) return;
    setSyncing(true);
    setSyncResult(null);
    const result = await triggerSync(integration.id);
    setSyncing(false);
    if (result.error) {
      setSyncResult(result.error);
    } else {
      setSyncResult(
        `${t("syncComplete")}: ${result.invoices} ${t("invoices")}, ${result.expenses} ${t("expenses")}`
      );
    }
  }

  async function handleDisconnect() {
    if (!info.disconnectPath) return;
    setDisconnecting(true);
    try {
      await fetch(info.disconnectPath, { method: "POST" });
      window.location.reload();
    } catch {
      setDisconnecting(false);
    }
  }

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{info.icon}</span>
          <div>
            <h3 className="text-sm font-semibold text-content-primary">{info.name}</h3>
            {isConnected && integration?.last_sync_at && (
              <p className="text-xs text-content-quaternary">
                {t("lastSync")}: {new Date(integration.last_sync_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {/* Status badge */}
        {isConnected ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
            {t("connected")}
          </span>
        ) : configured ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-content-quaternary/20 text-content-quaternary border border-content-quaternary/30">
            {t("notConnected")}
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            {t("comingSoon")}
          </span>
        )}
      </div>

      {/* Error display */}
      {integration?.sync_error && (
        <p className="text-xs text-red-400 mb-3">{integration.sync_error}</p>
      )}

      {/* Sync result */}
      {syncResult && (
        <p className="text-xs text-content-secondary mb-3">{syncResult}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {isConnected ? (
          <>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-3 py-1.5 text-xs bg-brand-600 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50 transition-colors"
            >
              {syncing ? t("syncing") : t("syncNow")}
            </button>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="px-3 py-1.5 text-xs border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/10 disabled:opacity-50 transition-colors"
            >
              {disconnecting ? t("disconnecting") : t("disconnect")}
            </button>
          </>
        ) : configured && info.connectPath ? (
          <a
            href={info.connectPath}
            className="px-3 py-1.5 text-xs bg-brand-600 text-white rounded-lg hover:bg-brand-500 transition-colors inline-block"
          >
            {t("connect")}
          </a>
        ) : (
          <span className="text-xs text-content-quaternary">{t("notConfiguredDesc")}</span>
        )}
      </div>
    </div>
  );
}
