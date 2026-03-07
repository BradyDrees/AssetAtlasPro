"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { getIntegrations } from "@/app/actions/vendor-integrations";
import type { VendorIntegration } from "@/lib/integrations/qbo-types";
import { IntegrationCard } from "@/components/vendor/integration-card";

export default function ProIntegrationsPage() {
  const t = useTranslations("vendor.integrations");

  const [integrations, setIntegrations] = useState<VendorIntegration[]>([]);
  const [qboConfigured, setQboConfigured] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const result = await getIntegrations();
      setIntegrations(result.data);
      setQboConfigured(result.qboConfigured);
      setLoading(false);
    }
    load();
  }, []);

  const qboIntegration = integrations.find((i) => i.provider === "quickbooks") ?? null;

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 bg-surface-secondary rounded w-1/3" />
        <div className="h-32 bg-surface-secondary rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-content-primary">{t("title")}</h1>
        <p className="text-sm text-content-tertiary mt-1">{t("subtitle")}</p>
      </div>

      <div className="space-y-4">
        <IntegrationCard integration={qboIntegration} provider="quickbooks" configured={qboConfigured} />
        <IntegrationCard integration={null} provider="xero" configured={false} />
        <IntegrationCard integration={null} provider="stripe_connect" configured={false} />
      </div>
    </div>
  );
}
