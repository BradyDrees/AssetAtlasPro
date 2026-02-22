"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { VendorWoMaterial } from "@/lib/vendor/work-order-types";
import {
  addMaterial,
  deleteMaterial,
} from "@/app/actions/vendor-work-orders";

interface MaterialsLogProps {
  workOrderId: string;
  materials: VendorWoMaterial[];
  readOnly?: boolean;
}

export function MaterialsLog({
  workOrderId,
  materials,
  readOnly = false,
}: MaterialsLogProps) {
  const t = useTranslations("vendor.jobs");
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [loading, setLoading] = useState(false);

  const totalCost = materials.reduce(
    (sum, m) => sum + (Number(m.total) || 0),
    0
  );

  async function handleAdd() {
    if (!description.trim() || !unitCost) return;
    setLoading(true);
    const { error } = await addMaterial({
      work_order_id: workOrderId,
      description: description.trim(),
      quantity: Number(quantity) || 1,
      unit_cost: Number(unitCost) || 0,
    });
    setLoading(false);

    if (error) {
      alert(error);
    } else {
      setDescription("");
      setQuantity("1");
      setUnitCost("");
      setShowAdd(false);
      router.refresh();
    }
  }

  async function handleDelete(materialId: string) {
    const { error } = await deleteMaterial(materialId, workOrderId);
    if (error) {
      alert(error);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-content-primary">
          {t("materials.title")}
        </h3>
        {!readOnly && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="text-xs text-brand-600 hover:text-brand-700 font-medium"
          >
            {showAdd ? "Cancel" : `+ ${t("materials.add")}`}
          </button>
        )}
      </div>

      {/* Add material form */}
      {showAdd && (
        <div className="mb-4 p-3 bg-surface-secondary rounded-lg space-y-2">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("materials.description")}
            className="w-full p-2 bg-surface-primary border border-edge-primary rounded-lg text-sm text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
          <div className="flex gap-2">
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={t("materials.quantity")}
              min="0.01"
              step="0.01"
              className="w-20 p-2 bg-surface-primary border border-edge-primary rounded-lg text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
            <input
              type="number"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              placeholder={t("materials.unitCost")}
              min="0"
              step="0.01"
              className="flex-1 p-2 bg-surface-primary border border-edge-primary rounded-lg text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
            <button
              onClick={handleAdd}
              disabled={loading || !description.trim() || !unitCost}
              className="px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {loading ? "..." : "+"}
            </button>
          </div>
        </div>
      )}

      {/* Materials list */}
      {materials.length === 0 ? (
        <p className="text-xs text-content-quaternary">
          {t("materials.noMaterials")}
        </p>
      ) : (
        <div className="space-y-2">
          {materials.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between py-2 border-b border-edge-secondary last:border-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-content-primary truncate">
                  {m.description}
                </p>
                <p className="text-xs text-content-tertiary">
                  {m.quantity} × ${Number(m.unit_cost).toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-content-primary">
                  ${Number(m.total).toFixed(2)}
                </span>
                {!readOnly && (
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="text-content-quaternary hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <span className="text-sm font-semibold text-content-primary">
              {t("materials.total")}: ${totalCost.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
