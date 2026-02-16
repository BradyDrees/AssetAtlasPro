"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateBatch, deleteBatch } from "@/app/actions/unit-turns";

interface BatchActionsProps {
  batchId: string;
  batchStatus: string;
}

export function BatchActions({ batchId, batchStatus }: BatchActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleToggleStatus = async () => {
    setLoading(true);
    const newStatus = batchStatus === "OPEN" ? "CLOSED" : "OPEN";
    await updateBatch(batchId, "status", newStatus);
    setLoading(false);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!confirm("Delete this batch and all its units? This cannot be undone.")) return;
    setLoading(true);
    await deleteBatch(batchId);
    router.push("/unit-turns");
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleToggleStatus}
        disabled={loading}
        className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-lg hover:bg-white/30 border border-white/30 transition-all disabled:opacity-50"
      >
        {batchStatus === "OPEN" ? "Close Batch" : "Reopen Batch"}
      </button>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="px-3 py-2 bg-red-500/20 text-red-200 text-sm font-medium rounded-lg hover:bg-red-500/30 border border-red-400/30 transition-all disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}
