// ============================================
// Recurring Invoice Template Types
// ============================================

export type RecurringFrequency = "weekly" | "biweekly" | "monthly" | "quarterly" | "annual";

export type RecurringTemplateStatus = "active" | "paused" | "cancelled";

export interface RecurringInvoiceTemplate {
  id: string;
  vendor_org_id: string;
  pm_user_id: string | null;
  title: string;
  property_name: string | null;
  unit_info: string | null;
  items: RecurringInvoiceItem[];
  subtotal: number;
  tax_pct: number;
  tax_amount: number;
  total: number;
  frequency: RecurringFrequency;
  next_due: string; // DATE
  last_generated: string | null; // DATE
  status: RecurringTemplateStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecurringInvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  item_type: "labor" | "material" | "other";
}

export interface CreateRecurringTemplateInput {
  title: string;
  pm_user_id?: string;
  property_name?: string;
  unit_info?: string;
  items: RecurringInvoiceItem[];
  tax_pct?: number;
  frequency: RecurringFrequency;
  next_due: string;
  notes?: string;
}

export interface UpdateRecurringTemplateInput {
  title?: string;
  pm_user_id?: string;
  property_name?: string;
  unit_info?: string;
  items?: RecurringInvoiceItem[];
  tax_pct?: number;
  frequency?: RecurringFrequency;
  next_due?: string;
  notes?: string;
}

/** Calculate the next due date based on frequency */
export function advanceNextDue(currentDue: string, frequency: RecurringFrequency): string {
  const d = new Date(currentDue + "T00:00:00");
  switch (frequency) {
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "biweekly":
      d.setDate(d.getDate() + 14);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    case "quarterly":
      d.setMonth(d.getMonth() + 3);
      break;
    case "annual":
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d.toISOString().split("T")[0];
}

/** Frequency display labels */
export const FREQUENCY_LABELS: Record<RecurringFrequency, { en: string; es: string }> = {
  weekly: { en: "Weekly", es: "Semanal" },
  biweekly: { en: "Biweekly", es: "Quincenal" },
  monthly: { en: "Monthly", es: "Mensual" },
  quarterly: { en: "Quarterly", es: "Trimestral" },
  annual: { en: "Annual", es: "Anual" },
};
