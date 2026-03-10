"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  addClientNote,
  setFollowup,
  updateLeadStatus,
} from "@/app/actions/vendor-clients-direct";
import type { ClientWithPipeline, ClientNote } from "@/app/actions/vendor-clients-direct";

const STATUSES = ["new", "contacted", "quoted", "won", "lost", "active"] as const;

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  contacted: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  quoted: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  won: "bg-green-500/10 text-green-400 border-green-500/30",
  lost: "bg-red-500/10 text-red-400 border-red-500/30",
  active: "bg-brand-500/10 text-brand-400 border-brand-500/30",
};

interface ClientDetailPageProps {
  client: ClientWithPipeline;
  notes: ClientNote[];
  onRefresh: () => void;
}

export function ClientDetailPage({ client, notes: initialNotes, onRefresh }: ClientDetailPageProps) {
  const t = useTranslations("vendor.clients.pipeline");
  const dt = useTranslations("vendor.clients.direct");
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState(initialNotes);
  const [newNote, setNewNote] = useState("");
  const [followupDate, setFollowupDate] = useState(
    client.next_followup_at ? client.next_followup_at.split("T")[0] : ""
  );

  const handleStatusChange = (newStatus: string) => {
    const oldStatus = client.lead_status ?? "new";
    if (oldStatus === newStatus) return;
    startTransition(async () => {
      await updateLeadStatus(client.id, newStatus, oldStatus);
      onRefresh();
    });
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    startTransition(async () => {
      const result = await addClientNote(client.id, newNote);
      if (result.data) {
        setNotes([result.data, ...notes]);
        setNewNote("");
      }
    });
  };

  const handleSetFollowup = () => {
    startTransition(async () => {
      const value = followupDate ? new Date(followupDate + "T09:00:00").toISOString() : null;
      await setFollowup(client.id, value);
      onRefresh();
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Back link */}
      <Link
        href="/vendor/clients"
        className="inline-flex items-center gap-1 text-sm text-content-tertiary hover:text-content-primary"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        {t("backToClients")}
      </Link>

      {/* Header */}
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-content-primary">{client.name}</h1>
            {client.contact_name && (
              <p className="text-sm text-content-tertiary mt-0.5">{client.contact_name}</p>
            )}
          </div>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[client.lead_status ?? "new"]}`}>
            {t(`status.${client.lead_status ?? "new"}`)}
          </span>
        </div>

        {/* Contact info */}
        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-content-tertiary">
          {client.phone && (
            <a href={`tel:${client.phone}`} className="flex items-center gap-1.5 hover:text-content-primary">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
              {client.phone}
            </a>
          )}
          {client.email && (
            <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 hover:text-content-primary">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              {client.email}
            </a>
          )}
          {client.city && client.state && (
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              {client.city}, {client.state}
            </span>
          )}
        </div>

        {/* Tags */}
        {client.tags && client.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {client.tags.map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-surface-secondary rounded-lg px-3 py-2">
            <p className="text-lg font-bold text-content-primary">
              ${Number(client.lifetime_revenue ?? 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-content-quaternary">{t("lifetimeRevenue")}</p>
          </div>
          <div className="bg-surface-secondary rounded-lg px-3 py-2">
            <p className="text-sm font-bold text-content-primary">
              {client.last_job_at
                ? new Date(client.last_job_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                : "—"}
            </p>
            <p className="text-[10px] text-content-quaternary">{t("lastJob")}</p>
          </div>
          <div className="bg-surface-secondary rounded-lg px-3 py-2">
            <p className="text-sm font-bold text-content-primary">
              {client.lead_source ?? "—"}
            </p>
            <p className="text-[10px] text-content-quaternary">{t("source")}</p>
          </div>
        </div>
      </div>

      {/* Status change + Followup */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status selector */}
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
          <h3 className="text-sm font-semibold text-content-primary mb-2">{t("changeStatus")}</h3>
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                disabled={isPending || (client.lead_status ?? "new") === s}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-40 ${
                  (client.lead_status ?? "new") === s
                    ? STATUS_COLORS[s]
                    : "bg-surface-secondary text-content-tertiary border-edge-secondary hover:border-edge-primary"
                }`}
              >
                {t(`status.${s}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Follow-up */}
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
          <h3 className="text-sm font-semibold text-content-primary mb-2">{t("followup")}</h3>
          <div className="flex gap-2">
            <input
              type="date"
              value={followupDate}
              onChange={(e) => setFollowupDate(e.target.value)}
              className="flex-1 px-3 py-2 bg-surface-secondary border border-edge-secondary rounded-lg text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
            <button
              onClick={handleSetFollowup}
              disabled={isPending}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {t("setFollowup")}
            </button>
          </div>
        </div>
      </div>

      {/* Notes timeline */}
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-5">
        <h3 className="text-sm font-semibold text-content-primary mb-3">{t("notes")}</h3>

        {/* Add note */}
        <div className="flex gap-2 mb-4">
          <input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder={t("addNotePlaceholder")}
            onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
            className="flex-1 px-3 py-2 bg-surface-secondary border border-edge-secondary rounded-lg text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
          <button
            onClick={handleAddNote}
            disabled={isPending || !newNote.trim()}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {t("addNote")}
          </button>
        </div>

        {/* Timeline */}
        {notes.length === 0 ? (
          <p className="text-xs text-content-quaternary text-center py-4">{t("noNotes")}</p>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${note.is_system ? "bg-content-quaternary" : "bg-brand-500"}`} />
                  <div className="w-px flex-1 bg-edge-secondary" />
                </div>
                <div className="flex-1 pb-3">
                  <p className={`text-sm ${note.is_system ? "text-content-quaternary italic" : "text-content-secondary"}`}>
                    {note.note}
                  </p>
                  <p className="text-[10px] text-content-quaternary mt-0.5">
                    {new Date(note.created_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Client details */}
      {client.notes && (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
          <h3 className="text-sm font-semibold text-content-primary mb-2">{dt("notes")}</h3>
          <p className="text-sm text-content-secondary whitespace-pre-wrap">{client.notes}</p>
        </div>
      )}
    </div>
  );
}
