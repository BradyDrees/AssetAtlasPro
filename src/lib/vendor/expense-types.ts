// ============================================
// Vendor Expenses, Clients, Skills, Document Templates
// Phase 11 + Workiz Enhancements — TypeScript Types
// ============================================

import type {
  ExpenseCategory,
  ClientType,
  DocumentTemplateType,
  SkillProficiency,
} from "./types";

// ============================================
// Expense
// ============================================

export interface VendorExpense {
  id: string;
  vendor_org_id: string;
  work_order_id: string | null;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
  receipt_path: string | null;
  receipt_file_name: string | null;
  receipt_file_size: number | null;
  notes: string | null;
  is_reimbursable: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseInput {
  work_order_id?: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date?: string;
  notes?: string;
  is_reimbursable?: boolean;
}

export interface UpdateExpenseInput {
  work_order_id?: string | null;
  category?: ExpenseCategory;
  description?: string;
  amount?: number;
  date?: string;
  notes?: string;
  is_reimbursable?: boolean;
}

/** Expense summary by category */
export interface ExpenseCategorySummary {
  category: ExpenseCategory;
  total: number;
  count: number;
}

// ============================================
// Client (Direct vendor clients)
// ============================================

export interface VendorClient {
  id: string;
  vendor_org_id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  client_type: ClientType;
  notes: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateClientInput {
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  client_type?: ClientType;
  notes?: string;
}

export interface UpdateClientInput {
  name?: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  client_type?: ClientType;
  notes?: string;
  is_active?: boolean;
}

// ============================================
// Document Template
// ============================================

export interface VendorDocumentTemplate {
  id: string;
  vendor_org_id: string;
  name: string;
  type: DocumentTemplateType;
  content: string;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDocumentTemplateInput {
  name: string;
  type: DocumentTemplateType;
  content: string;
  is_default?: boolean;
}

export interface UpdateDocumentTemplateInput {
  name?: string;
  type?: DocumentTemplateType;
  content?: string;
  is_default?: boolean;
}

// ============================================
// Skill (normalized tables)
// ============================================

export interface VendorSkill {
  id: string;
  vendor_org_id: string;
  name: string;
  category: string | null;
  is_active: boolean;
  created_at: string;
}

export interface VendorUserSkill {
  id: string;
  vendor_user_id: string;
  skill_id: string;
  proficiency: SkillProficiency;
  certified_at: string | null;
  created_at: string;
}

export interface CreateSkillInput {
  name: string;
  category?: string;
}

export interface AssignSkillInput {
  vendor_user_id: string;
  skill_id: string;
  proficiency?: SkillProficiency;
  certified_at?: string;
}

// ============================================
// Profitability (used in reports + job detail)
// ============================================

/**
 * Profitability contract:
 * - Revenue = paid invoices only (cash basis)
 * - Costs = materials + expenses + labor (where hourly_rate stored)
 * - Profit = Revenue - Costs
 * - If no hourly_rate data: exclude labor, label as "Revenue minus Materials & Expenses"
 */
export interface JobProfitability {
  work_order_id: string;
  revenue: number;
  material_cost: number;
  expense_cost: number;
  labor_cost: number;
  labor_cost_available: boolean;
  profit: number;
  margin_pct: number | null; // null if revenue is 0
}

/** All expense categories as an array (for UI dropdowns) */
export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "fuel",
  "tools",
  "supplies",
  "materials",
  "subcontractor",
  "permits",
  "insurance",
  "office",
  "vehicle",
  "travel",
  "meals",
  "other",
];

/** Display colors for expense categories */
export const EXPENSE_CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  fuel: "#f59e0b",
  tools: "#6366f1",
  supplies: "#8b5cf6",
  materials: "#0ea5e9",
  subcontractor: "#ec4899",
  permits: "#14b8a6",
  insurance: "#f97316",
  office: "#64748b",
  vehicle: "#84cc16",
  travel: "#06b6d4",
  meals: "#a855f7",
  other: "#9ca3af",
};
