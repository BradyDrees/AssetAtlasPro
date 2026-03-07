// ============================================
// Service Agreements — TypeScript Types
// ============================================

export type AgreementFrequency =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "semi_annual"
  | "annual";

export type AgreementStatus = "active" | "paused" | "cancelled" | "expired";

export interface ServiceAgreement {
  id: string;
  vendor_org_id: string;
  pm_user_id: string | null;
  homeowner_id: string | null;
  homeowner_property_id: string | null;
  property_name: string | null;
  service_type: string;
  trade: string;
  description: string | null;
  frequency: AgreementFrequency;
  price: number;
  next_due: string | null;
  last_generated: string | null;
  status: AgreementStatus;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAgreementInput {
  pm_user_id?: string;
  homeowner_id?: string;
  homeowner_property_id?: string;
  property_name?: string;
  service_type: string;
  trade: string;
  description?: string;
  frequency: AgreementFrequency;
  price?: number;
  start_date?: string;
  end_date?: string;
  notes?: string;
}

export interface UpdateAgreementInput {
  property_name?: string;
  service_type?: string;
  trade?: string;
  description?: string;
  frequency?: AgreementFrequency;
  price?: number;
  start_date?: string;
  end_date?: string;
  notes?: string;
}

/** Status display colors */
export const AGREEMENT_STATUS_COLORS: Record<AgreementStatus, string> = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  paused: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
  expired: "bg-content-quaternary/20 text-content-quaternary border-content-quaternary/30",
};

/** Convert frequency to next-due date advancement */
export function advanceDate(from: Date, frequency: AgreementFrequency): Date {
  const next = new Date(from);
  switch (frequency) {
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "biweekly":
      next.setDate(next.getDate() + 14);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "quarterly":
      next.setMonth(next.getMonth() + 3);
      break;
    case "semi_annual":
      next.setMonth(next.getMonth() + 6);
      break;
    case "annual":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}
