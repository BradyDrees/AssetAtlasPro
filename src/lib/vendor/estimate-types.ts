// ============================================
// Vendor Estimates — Full TypeScript Types
// ============================================

import type {
  EstimateStatus,
  EstimateTierMode,
  EstimateTier,
  EstimateItemType,
} from "./types";

// ============================================
// Estimate
// ============================================

export interface VendorEstimate {
  id: string;
  vendor_org_id: string;
  created_by: string | null;
  pm_user_id: string | null;
  work_order_id: string | null;
  estimate_number: string | null;
  property_name: string | null;
  property_address: string | null;
  unit_info: string | null;
  title: string | null;
  description: string | null;
  tier_mode: EstimateTierMode;
  subtotal: number;
  markup_pct: number;
  markup_amount: number;
  tax_pct: number;
  tax_amount: number;
  total: number;
  status: EstimateStatus;
  change_request_notes: string | null;
  sent_at: string | null;
  approved_at: string | null;
  valid_until: string | null;
  terms: string | null;
  internal_notes: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Section
// ============================================

export interface VendorEstimateSection {
  id: string;
  estimate_id: string;
  name: string;
  sort_order: number;
  tier: EstimateTier | null;
  subtotal: number;
  created_at: string;
}

// ============================================
// Line Item
// ============================================

export interface VendorEstimateItem {
  id: string;
  section_id: string;
  description: string;
  item_type: EstimateItemType;
  quantity: number;
  unit: string;
  unit_price: number;
  markup_pct: number;
  total: number;
  sort_order: number;
  tier: EstimateTier | null;
  notes: string | null;
  created_at: string;
}

// ============================================
// Photo
// ============================================

export interface VendorEstimatePhoto {
  id: string;
  estimate_id: string;
  section_id: string | null;
  item_id: string | null;
  storage_path: string;
  caption: string | null;
  annotation_data: Record<string, unknown> | null;
  sort_order: number;
  created_at: string;
}

// ============================================
// Input types
// ============================================

export interface CreateEstimateInput {
  pm_user_id?: string;
  work_order_id?: string;
  property_name?: string;
  property_address?: string;
  unit_info?: string;
  title?: string;
  description?: string;
  tier_mode?: EstimateTierMode;
  terms?: string;
  valid_until?: string;
}

export interface CreateSectionInput {
  estimate_id: string;
  name: string;
  tier?: EstimateTier;
  sort_order?: number;
}

export interface CreateItemInput {
  section_id: string;
  description: string;
  item_type?: EstimateItemType;
  quantity?: number;
  unit?: string;
  unit_price?: number;
  markup_pct?: number;
  tier?: EstimateTier;
  notes?: string;
  sort_order?: number;
}

export interface UpdateItemInput {
  description?: string;
  item_type?: EstimateItemType;
  quantity?: number;
  unit?: string;
  unit_price?: number;
  markup_pct?: number;
  tier?: EstimateTier;
  notes?: string;
  sort_order?: number;
}

// ============================================
// Status display helpers
// ============================================

export const ESTIMATE_STATUS_COLORS: Record<EstimateStatus, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  pm_reviewing: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  with_owner: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  changes_requested: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  declined: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  expired: "bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-500",
};
