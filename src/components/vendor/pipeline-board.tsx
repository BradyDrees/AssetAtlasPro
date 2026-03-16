"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { updateLeadStatus } from "@/app/actions/vendor-clients-direct";
import type { ClientWithPipeline } from "@/app/actions/vendor-clients-direct";
import { useFormatDate } from "@/hooks/use-format-date";

const PIPELINE_COLUMNS = ["new", "contacted", "quoted", "won", "lost"] as const;
type PipelineStatus = (typeof PIPELINE_COLUMNS)[number];

const COLUMN_COLORS: Record<PipelineStatus, string> = {
  new: "border-t-blue-500",
  contacted: "border-t-cyan-500",
  quoted: "border-t-purple-500",
  won: "border-t-green-500",
  lost: "border-t-red-500",
};

const COLUMN_DOT_COLORS: Record<PipelineStatus, string> = {
  new: "bg-blue-500",
  contacted: "bg-cyan-500",
  quoted: "bg-purple-500",
  won: "bg-green-500",
  lost: "bg-red-500",
};

interface PipelineBoardProps {
  clients: ClientWithPipeline[];
  onUpdate: () => void;
}

export function PipelineBoard({ clients, onUpdate }: PipelineBoardProps) {
  const t = useTranslations("vendor.clients.pipeline");
  const { formatDate } = useFormatDate();
  const [isPending, startTransition] = useTransition();
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const grouped = PIPELINE_COLUMNS.reduce(
    (acc, col) => {
      acc[col] = clients.filter((c) => (c.lead_status ?? "new") === col);
      return acc;
    },
    {} as Record<PipelineStatus, ClientWithPipeline[]>
  );

  const handleDragStart = (clientId: string) => {
    setDraggedId(clientId);
  };

  const handleDrop = (newStatus: PipelineStatus) => {
    if (!draggedId) return;
    const client = clients.find((c) => c.id === draggedId);
    if (!client) return;

    const oldStatus = (client.lead_status ?? "new") as string;
    if (oldStatus === newStatus) {
      setDraggedId(null);
      return;
    }

    startTransition(async () => {
      await updateLeadStatus(draggedId, newStatus, oldStatus);
      setDraggedId(null);
      onUpdate();
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-3 min-w-[900px]">
        {PIPELINE_COLUMNS.map((col) => {
          const items = grouped[col];
          return (
            <div
              key={col}
              className={`flex-1 min-w-[170px] bg-surface-secondary rounded-lg border-t-2 ${COLUMN_COLORS[col]}`}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(col)}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${COLUMN_DOT_COLORS[col]}`} />
                  <span className="text-xs font-semibold text-content-primary uppercase tracking-wider">
                    {t(`status.${col}`)}
                  </span>
                </div>
                <span className="text-[10px] text-content-quaternary font-medium">
                  {items.length}
                </span>
              </div>

              {/* Cards */}
              <div className="px-2 pb-2 space-y-1.5 min-h-[80px]">
                {items.map((client) => (
                  <Link
                    key={client.id}
                    href={`/vendor/clients/${client.id}`}
                    draggable
                    onDragStart={() => handleDragStart(client.id)}
                    className={`block p-2.5 rounded-lg bg-surface-primary border border-edge-secondary hover:border-edge-primary transition-all cursor-grab active:cursor-grabbing ${
                      draggedId === client.id ? "opacity-40" : ""
                    } ${isPending ? "pointer-events-none" : ""}`}
                  >
                    <p className="text-xs font-medium text-content-primary truncate">
                      {client.name}
                    </p>
                    {client.contact_name && (
                      <p className="text-[10px] text-content-quaternary truncate mt-0.5">
                        {client.contact_name}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      {client.lifetime_revenue > 0 && (
                        <span className="text-[10px] text-green-400 font-medium">
                          ${Number(client.lifetime_revenue).toLocaleString()}
                        </span>
                      )}
                      {client.next_followup_at && (
                        <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatDate(client.next_followup_at, { weekday: false, year: false })}
                        </span>
                      )}
                    </div>
                    {client.tags && client.tags.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 mt-1">
                        {client.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="text-[9px] px-1 py-0.5 rounded bg-brand-500/10 text-brand-400">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
