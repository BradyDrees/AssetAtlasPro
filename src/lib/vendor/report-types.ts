// ============================================
// Vendor Reports — TypeScript Types
// Phase 10: Reporting & Analytics Engine
// ============================================

// ============================================
// Shared Report Types
// ============================================

/** Date range filter for all reports */
export interface ReportDateRange {
  start: string; // ISO date string
  end: string; // ISO date string
}

/** Revenue recognition method */
export type RevenueSource = "paid" | "issued";

/** Date range preset options */
export type DateRangePreset =
  | "this_week"
  | "this_month"
  | "this_quarter"
  | "this_year"
  | "last_month"
  | "last_quarter"
  | "last_year"
  | "custom";

// ============================================
// Jobs Report
// ============================================

export interface JobsReportRow {
  id: string;
  property_name: string | null;
  description: string | null;
  trade: string | null;
  status: string;
  priority: string;
  job_type: string | null;
  assigned_to_name: string | null;
  scheduled_date: string | null;
  completed_at: string | null;
  revenue: number;
  material_cost: number;
  expense_cost: number;
  labor_cost: number;
  labor_cost_available: boolean;
  profit: number;
  margin_pct: number | null;
}

export interface JobsReportFilters {
  dateRange?: ReportDateRange;
  status?: string[];
  trade?: string;
  job_type?: string;
  assigned_to?: string;
}

// ============================================
// Sales Report
// ============================================

export interface SalesReportRow {
  date: string;
  invoice_count: number;
  revenue: number;
  tax_collected: number;
}

export interface SalesReportSummary {
  total_revenue: number;
  total_tax: number;
  invoice_count: number;
  avg_invoice_value: number;
  data: SalesReportRow[];
}

// ============================================
// Estimates Funnel
// ============================================

export interface EstimatesFunnelRow {
  status: string;
  count: number;
  total_value: number;
}

export interface EstimatesFunnelSummary {
  total_sent: number;
  total_approved: number;
  total_declined: number;
  approval_rate: number; // percentage
  conversion_rate: number; // approved / sent
  avg_estimate_value: number;
  funnel: EstimatesFunnelRow[];
}

// ============================================
// Invoice Aging
// ============================================

export interface InvoiceAgingBucket {
  label: string;
  min_days: number;
  max_days: number | null; // null = 90+
  count: number;
  total: number;
}

export interface InvoiceAgingRow {
  id: string;
  invoice_number: string | null;
  property_name: string | null;
  pm_name: string | null;
  submitted_at: string | null;
  due_date: string | null;
  total: number;
  balance_due: number;
  days_outstanding: number;
  bucket: string;
}

export interface InvoiceAgingSummary {
  buckets: InvoiceAgingBucket[];
  invoices: InvoiceAgingRow[];
  total_outstanding: number;
}

// ============================================
// Timesheets Report
// ============================================

export interface TimesheetRow {
  vendor_user_id: string;
  user_name: string | null;
  work_order_id: string;
  property_name: string | null;
  clock_in: string;
  clock_out: string | null;
  duration_minutes: number;
  hourly_rate: number | null;
  labor_cost: number | null;
}

export interface TimesheetSummary {
  total_hours: number;
  total_labor_cost: number | null;
  labor_cost_available: boolean;
  entries: TimesheetRow[];
}

// ============================================
// Tax Report
// ============================================

export interface TaxReportRow {
  month: string; // "YYYY-MM"
  taxable_sales: number;
  tax_collected: number;
  invoice_count: number;
}

export interface TaxReportSummary {
  total_taxable_sales: number;
  total_tax_collected: number;
  effective_tax_rate: number | null;
  data: TaxReportRow[];
}

// ============================================
// Export options
// ============================================

export type ExportFormat = "csv" | "xlsx";

export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  maxRows?: number; // Default 10000
}
