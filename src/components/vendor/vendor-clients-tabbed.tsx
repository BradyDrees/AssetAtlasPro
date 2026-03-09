"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ClientCard } from "./client-card";
import { ClientImport } from "./client-import";
import { VendorInvitePmModal } from "./vendor-invite-pm-modal";
import { ClientInviteModal } from "./client-invite-modal";
import {
  getDirectClients,
  createDirectClient,
  deleteDirectClient,
} from "@/app/actions/vendor-clients-direct";
import type { ClientWithStats } from "@/app/actions/vendor-clients";
import type { VendorClient, CreateClientInput } from "@/lib/vendor/expense-types";

interface VendorClientsTabbedProps {
  pmClients: ClientWithStats[];
  directClients: VendorClient[];
}

const CLIENT_TYPES = ["direct", "homeowner", "business", "other"] as const;

export function VendorClientsTabbed({
  pmClients,
  directClients: initialDirectClients,
}: VendorClientsTabbedProps) {
  const t = useTranslations("vendor.clients");
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"pm" | "direct">("pm");
  const [directClients, setDirectClients] = useState(initialDirectClients);
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // PM tab modals
  const [showInvitePm, setShowInvitePm] = useState(false);
  const [showInviteClient, setShowInviteClient] = useState(false);

  // Add client form state
  const [formData, setFormData] = useState<CreateClientInput>({
    name: "",
    contact_name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    client_type: "direct",
    notes: "",
  });

  const refreshDirectClients = () => {
    startTransition(async () => {
      const { data } = await getDirectClients();
      setDirectClients(data);
    });
  };

  const handleCreateClient = () => {
    if (!formData.name.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await createDirectClient(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setShowAddForm(false);
        setFormData({
          name: "",
          contact_name: "",
          phone: "",
          email: "",
          address: "",
          city: "",
          state: "",
          zip: "",
          client_type: "direct",
          notes: "",
        });
        refreshDirectClients();
      }
    });
  };

  const handleDeleteClient = (clientId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await deleteDirectClient(clientId);
      if (result.error) {
        setError(result.error);
      } else {
        refreshDirectClients();
      }
    });
  };

  const filteredDirectClients = search.trim()
    ? directClients.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
          c.email?.toLowerCase().includes(search.toLowerCase())
      )
    : directClients;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header with tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-1 bg-surface-secondary rounded-lg p-1">
          <button
            onClick={() => setActiveTab("pm")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "pm"
                ? "bg-surface-primary text-content-primary shadow-sm"
                : "text-content-tertiary hover:text-content-primary"
            }`}
          >
            {t("tabs.pm")}
            {pmClients.length > 0 && (
              <span className="ml-1.5 text-xs text-content-quaternary">
                ({pmClients.length})
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("direct")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "direct"
                ? "bg-surface-primary text-content-primary shadow-sm"
                : "text-content-tertiary hover:text-content-primary"
            }`}
          >
            {t("tabs.direct")}
            {directClients.length > 0 && (
              <span className="ml-1.5 text-xs text-content-quaternary">
                ({directClients.length})
              </span>
            )}
          </button>
        </div>

        {/* Action buttons — different per tab */}
        {activeTab === "pm" ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInviteClient(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-4.504a4.5 4.5 0 00-7.244-1.242l-4.5 4.5a4.5 4.5 0 006.364 6.364l1.757-1.757"
                />
              </svg>
              {t("clientInvite.button")}
            </button>
            <button
              onClick={() => setShowInvitePm(true)}
              className="px-4 py-2 rounded-lg border border-edge-primary bg-surface-secondary hover:bg-surface-tertiary text-sm font-medium text-content-secondary transition-colors"
            >
              {t("invitePm.title")}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              {t("direct.addClient")}
            </button>
          </div>
        )}
      </div>

      {/* PM tab content */}
      {activeTab === "pm" && (
        <>
          {pmClients.length === 0 ? (
            <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center">
              <svg
                className="w-12 h-12 text-content-quaternary mx-auto mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                />
              </svg>
              <p className="text-content-tertiary text-sm">{t("noClients")}</p>
              <p className="text-xs text-content-quaternary mt-1">
                {t("waitForInvite")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {pmClients.map((client) => (
                <ClientCard key={client.id} client={client} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Direct tab content */}
      {activeTab === "direct" && (
        <>
          {/* Error banner */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Search + Import row */}
          {directClients.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-quaternary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("direct.search")}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-primary border border-edge-primary rounded-lg text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                />
              </div>
              <ClientImport onImported={refreshDirectClients} />
            </div>
          )}

          {/* Add client form */}
          {showAddForm && (
            <div className="bg-surface-primary rounded-xl border border-edge-primary p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-content-primary">
                  {t("direct.addClient")}
                </h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-content-quaternary hover:text-content-secondary"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder={t("direct.namePlaceholder")}
                  className="px-3 py-2 bg-surface-secondary border border-edge-primary rounded-lg text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
                <input
                  type="text"
                  value={formData.contact_name || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_name: e.target.value })
                  }
                  placeholder={t("direct.contactPlaceholder")}
                  className="px-3 py-2 bg-surface-secondary border border-edge-primary rounded-lg text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
                <input
                  type="tel"
                  value={formData.phone || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder={t("direct.phone")}
                  className="px-3 py-2 bg-surface-secondary border border-edge-primary rounded-lg text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
                <input
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder={t("direct.email")}
                  className="px-3 py-2 bg-surface-secondary border border-edge-primary rounded-lg text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
                <input
                  type="text"
                  value={formData.address || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder={t("direct.address")}
                  className="px-3 py-2 bg-surface-secondary border border-edge-primary rounded-lg text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500/30 sm:col-span-2"
                />
                <input
                  type="text"
                  value={formData.city || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  placeholder={t("direct.city")}
                  className="px-3 py-2 bg-surface-secondary border border-edge-primary rounded-lg text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={formData.state || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                    placeholder={t("direct.state")}
                    className="px-3 py-2 bg-surface-secondary border border-edge-primary rounded-lg text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                  <input
                    type="text"
                    value={formData.zip || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, zip: e.target.value })
                    }
                    placeholder={t("direct.zip")}
                    className="px-3 py-2 bg-surface-secondary border border-edge-primary rounded-lg text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                </div>
                <select
                  value={formData.client_type || "direct"}
                  onChange={(e) =>
                    setFormData({ ...formData, client_type: e.target.value as CreateClientInput["client_type"] })
                  }
                  className="px-3 py-2 bg-surface-secondary border border-edge-primary rounded-lg text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                >
                  {CLIENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t(`direct.types.${type}`)}
                    </option>
                  ))}
                </select>
                <textarea
                  value={formData.notes || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder={t("direct.notesPlaceholder")}
                  rows={2}
                  className="px-3 py-2 bg-surface-secondary border border-edge-primary rounded-lg text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500/30 sm:col-span-2"
                />
              </div>

              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-sm text-content-secondary hover:text-content-primary transition-colors"
                >
                  {t("direct.cancel")}
                </button>
                <button
                  onClick={handleCreateClient}
                  disabled={isPending || !formData.name.trim()}
                  className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
                >
                  {isPending ? t("direct.creating") : t("direct.create")}
                </button>
              </div>
            </div>
          )}

          {/* Direct clients list */}
          {directClients.length === 0 && !showAddForm ? (
            <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center">
              <svg
                className="w-12 h-12 text-content-quaternary mx-auto mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                />
              </svg>
              <p className="text-content-tertiary text-sm">
                {t("direct.noClients")}
              </p>
              <p className="text-xs text-content-quaternary mt-1">
                {t("direct.addFirst")}
              </p>
              <div className="mt-4 flex justify-center gap-3">
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
                >
                  {t("direct.addClient")}
                </button>
                <ClientImport onImported={refreshDirectClients} />
              </div>
            </div>
          ) : filteredDirectClients.length === 0 && search.trim() ? (
            <div className="bg-surface-primary rounded-xl border border-edge-primary p-6 text-center">
              <p className="text-content-tertiary text-sm">
                No clients match &quot;{search}&quot;
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredDirectClients.map((client) => (
                <div
                  key={client.id}
                  className="bg-surface-primary rounded-xl border border-edge-primary p-5 hover:border-edge-secondary transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-content-primary truncate">
                          {client.name}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                            client.is_active
                              ? "bg-green-500/20 text-green-400 border-green-500/30"
                              : "bg-content-quaternary/20 text-content-quaternary border-content-quaternary/30"
                          }`}
                        >
                          {client.is_active
                            ? t("direct.active")
                            : t("direct.inactive")}
                        </span>
                        {client.client_type && client.client_type !== "direct" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border bg-blue-500/20 text-blue-400 border-blue-500/30">
                            {t(`direct.types.${client.client_type}`)}
                          </span>
                        )}
                      </div>
                      {client.contact_name && (
                        <p className="text-xs text-content-tertiary">
                          {client.contact_name}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteClient(client.id)}
                      disabled={isPending}
                      className="text-content-quaternary hover:text-red-400 transition-colors flex-shrink-0 p-1"
                      title={t("direct.delete")}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                        />
                      </svg>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-content-quaternary">
                    {client.phone && (
                      <span className="flex items-center gap-1">
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                          />
                        </svg>
                        {client.phone}
                      </span>
                    )}
                    {client.email && (
                      <span className="flex items-center gap-1">
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                          />
                        </svg>
                        {client.email}
                      </span>
                    )}
                    {client.city && client.state && (
                      <span>
                        {client.city}, {client.state}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* PM tab modals — always in DOM so state isn't lost */}
      <VendorInvitePmModal
        open={showInvitePm}
        onClose={() => setShowInvitePm(false)}
      />
      <ClientInviteModal
        open={showInviteClient}
        onClose={() => setShowInviteClient(false)}
      />
    </div>
  );
}
