// ============================================
// Vendor Work Order — Full TypeScript Types
// ============================================

import type {
  WoStatus,
  WoPriority,
  WoBudgetType,
} from "./types";

// ============================================
// Work Order
// ============================================

export interface VendorWorkOrder {
  id: string;
  vendor_org_id: string;
  assigned_to: string | null;
  pm_user_id: string;
  property_name: string | null;
  property_address: string | null;
  unit_number: string | null;
  description: string | null;
  pm_notes: string | null;
  access_notes: string | null;
  tenant_name: string | null;
  tenant_phone: string | null;
  tenant_language: string | null;
  trade: string | null;
  priority: WoPriority;
  status: WoStatus;
  budget_type: WoBudgetType | null;
  budget_amount: number | null;
  scheduled_date: string | null;
  scheduled_time_start: string | null;
  scheduled_time_end: string | null;
  started_at: string | null;
  completed_at: string | null;
  completion_notes: string | null;
  decline_reason: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Materials
// ============================================

export interface VendorWoMaterial {
  id: string;
  work_order_id: string;
  description: string;
  quantity: number;
  unit_cost: number;
  total: number;
  created_by: string | null;
  created_at: string;
}

// ============================================
// Time Entries
// ============================================

export interface VendorWoTimeEntry {
  id: string;
  work_order_id: string;
  vendor_user_id: string | null;
  clock_in: string;
  clock_out: string | null;
  duration_minutes: number | null;
  hourly_rate: number | null;
  notes: string | null;
  created_at: string;
}

// ============================================
// Create / Update Input Types
// ============================================

export interface CreateWorkOrderInput {
  vendor_org_id: string;
  assigned_to?: string;
  property_name?: string;
  property_address?: string;
  unit_number?: string;
  description?: string;
  pm_notes?: string;
  access_notes?: string;
  tenant_name?: string;
  tenant_phone?: string;
  tenant_language?: string;
  trade?: string;
  priority?: WoPriority;
  budget_type?: WoBudgetType;
  budget_amount?: number;
  scheduled_date?: string;
  scheduled_time_start?: string;
  scheduled_time_end?: string;
}

export interface AddMaterialInput {
  work_order_id: string;
  description: string;
  quantity: number;
  unit_cost: number;
}

export interface ClockInInput {
  work_order_id: string;
  hourly_rate?: number;
  notes?: string;
}

// ============================================
// Status display helpers
// ============================================

/** Color classes for each status */
export const WO_STATUS_COLORS: Record<WoStatus, string> = {
  assigned: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  accepted: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  scheduled: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  en_route: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  on_site: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  in_progress: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  invoiced: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  declined: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  on_hold: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

/** Priority color classes */
export const WO_PRIORITY_COLORS: Record<WoPriority, string> = {
  normal: "",
  urgent: "text-amber-600 dark:text-amber-400",
  emergency: "text-red-600 dark:text-red-400",
};

/** Priority dot colors */
export const WO_PRIORITY_DOT_COLORS: Record<WoPriority, string> = {
  normal: "bg-gray-400",
  urgent: "bg-amber-500 animate-pulse",
  emergency: "bg-red-500 animate-pulse",
};
