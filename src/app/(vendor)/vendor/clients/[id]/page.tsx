"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ClientDetailPage } from "@/components/vendor/client-detail-page";
import { getClientWithHistory } from "@/app/actions/vendor-clients-direct";
import type { ClientWithPipeline, ClientNote } from "@/app/actions/vendor-clients-direct";

export default function ClientDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const t = useTranslations("vendor.clients");
  const [client, setClient] = useState<ClientWithPipeline | null>(null);
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [clientId, setClientId] = useState<string>("");

  useEffect(() => {
    params.then((p) => {
      setClientId(p.id);
      loadClient(p.id);
    });
  }, []);

  const loadClient = async (id: string) => {
    setLoading(true);
    const result = await getClientWithHistory(id);
    if (result.client) {
      setClient(result.client);
      setNotes(result.notes);
    } else {
      setNotFound(true);
    }
    setLoading(false);
  };

  const handleRefresh = () => {
    if (clientId) loadClient(clientId);
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (notFound || !client) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center">
          <p className="text-red-400">{t("notFound")}</p>
          <Link
            href="/vendor/clients"
            className="text-sm text-brand-400 hover:text-brand-300 mt-3 inline-block"
          >
            {t("pipeline.backToClients")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ClientDetailPage
      client={client}
      notes={notes}
      onRefresh={handleRefresh}
    />
  );
}
