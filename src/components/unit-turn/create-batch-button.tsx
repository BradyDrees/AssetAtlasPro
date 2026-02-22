"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BatchForm } from "./batch-form";

export function CreateBatchButton() {
  const [open, setOpen] = useState(false);
  const t = useTranslations();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-lg hover:bg-white/30 border border-white/30 transition-all"
      >
        {t("unitTurn.newBatch")}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-surface-primary rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold text-content-primary mb-4">{t("unitTurn.newBatchTitle")}</h2>
            <BatchForm onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
