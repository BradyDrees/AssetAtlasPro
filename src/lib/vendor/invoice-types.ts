// ============================================
// Vendor Invoices — Full TypeScript Types
// ============================================

import type { InvoiceStatus, InvoiceItemType } from "./types";

// ============================================
// Invoice
// ============================================

export interface VendorInvoice {
  id: string;
  vendor_org_id: string;
  pm_user_id: string | null;
  work_order_id: string | null;
  estimate_id: string | null;
  invoice_number: string | null;
  property_name: string | null;
  unit_info: string | null;
  subtotal: number;
  tax_pct: number;
  tax_amount: number;
  total: number;
  status: InvoiceStatus;
  submitted_at: string | null;
  paid_at: string | null;
  due_date: string | null;
  notes: string | null;
  dispute_reason: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Invoice Item
// ============================================

export interface VendorInvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  item_type: InvoiceItemType;
  created_at: string;
}

// ============================================
// Input types
// ============================================

export interface CreateInvoiceInput {
  pm_user_id?: string;
  work_order_id?: string;
  estimate_id?: string;
  property_name?: string;
  unit_info?: string;
  notes?: string;
  due_date?: string;
  tax_pct?: number;
}

export interface CreateInvoiceItemInput {
  invoice_id: string;
  description: string;
  quantity?: number;
  unit_price?: number;
  item_type?: InvoiceItemType;
}

export interface UpdateInvoiceItemInput {
  description?: string;
  quantity?: number;
  unit_price?: number;
  item_type?: InvoiceItemType;
}

// ============================================
// Status display helpers
// ============================================

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  pm_approved: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  processing: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  disputed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};
