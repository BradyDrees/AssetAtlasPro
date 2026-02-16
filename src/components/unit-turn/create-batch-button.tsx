"use client";

import { useState } from "react";
import { BatchForm } from "./batch-form";

export function CreateBatchButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-lg hover:bg-white/30 border border-white/30 transition-all"
      >
        + New Batch
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">New Turn Batch</h2>
            <BatchForm onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
