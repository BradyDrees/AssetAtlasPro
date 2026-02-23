'use server';

import { createClient } from '@/lib/supabase/server';
import { requireVendorRole } from '@/lib/vendor/role-helpers';
import type {
  JobsReportFilters,
  JobsReportRow,
  ReportDateRange,
  SalesReportSummary,
  SalesReportRow,
  EstimatesFunnelSummary,
  EstimatesFunnelRow,
  InvoiceAgingSummary,
  InvoiceAgingBucket,
  InvoiceAgingRow,
  TimesheetSummary,
  TimesheetRow,
  TaxReportSummary,
  TaxReportRow,
} from '@/lib/vendor/report-types';

// ─── 1. Jobs Report ─────────────────────────────────────────────────────────

export async function getJobsReport(
  filters?: JobsReportFilters
): Promise<{ data: JobsReportRow[]; error?: string }> {
  try {
    const { vendor_org_id } = await requireVendorRole();
    const supabase = await createClient();

    let query = supabase
      .from('vendor_work_orders')
      .select('id, title, description, status, trade, job_type, priority, assigned_to, created_at, completed_at, scheduled_date')
      .eq('vendor_org_id', vendor_org_id);

    if (filters?.dateRange?.start) {
      query = query.gte('created_at', filters.dateRange.start);
    }
    if (filters?.dateRange?.end) {
      query = query.lte('created_at', filters.dateRange.end);
    }
    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }
    if (filters?.trade) {
      query = query.eq('trade', filters.trade);
    }
    if (filters?.job_type) {
      query = query.eq('job_type', filters.job_type);
    }
    if (filters?.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to);
    }

    const { data: jobs, error: jobsError } = await query.order('created_at', { ascending: false });

    if (jobsError) {
      return { data: [], error: jobsError.message };
    }
    if (!jobs || jobs.length === 0) {
      return { data: [] };
    }

    const jobIds = jobs.map((j) => j.id);

    // Fetch paid invoices for revenue
    const { data: invoices } = await supabase
      .from('vendor_invoices')
      .select('work_order_id, total')
      .eq('vendor_org_id', vendor_org_id)
      .eq('status', 'paid')
      .in('work_order_id', jobIds);

    // Fetch material costs
    const { data: materials } = await supabase
      .from('vendor_wo_materials')
      .select('work_order_id, total_cost')
      .in('work_order_id', jobIds);

    // Fetch expenses
    const { data: expenses } = await supabase
      .from('vendor_expenses')
      .select('work_order_id, amount')
      .in('work_order_id', jobIds);

    // Fetch time entries for labor cost
    const { data: timeEntries } = await supabase
      .from('vendor_wo_time_entries')
      .select('work_order_id, clock_in, clock_out, hourly_rate')
      .in('work_order_id', jobIds);

    // Build lookup maps
    const revenueMap: Record<string, number> = {};
    const materialMap: Record<string, number> = {};
    const expenseMap: Record<string, number> = {};
    const laborMap: Record<string, number> = {};

    (invoices || []).forEach((inv) => {
      if (!inv.work_order_id) return;
      revenueMap[inv.work_order_id] = (revenueMap[inv.work_order_id] || 0) + (Number(inv.total) || 0);
    });

    (materials || []).forEach((mat) => {
      if (!mat.work_order_id) return;
      materialMap[mat.work_order_id] = (materialMap[mat.work_order_id] || 0) + (Number(mat.total_cost) || 0);
    });

    (expenses || []).forEach((exp) => {
      if (!exp.work_order_id) return;
      expenseMap[exp.work_order_id] = (expenseMap[exp.work_order_id] || 0) + (Number(exp.amount) || 0);
    });

    (timeEntries || []).forEach((te) => {
      if (!te.work_order_id || !te.clock_in || !te.clock_out) return;
      const start = new Date(te.clock_in).getTime();
      const end = new Date(te.clock_out).getTime();
      const hours = Math.max(0, (end - start) / 3600000);
      const rate = Number(te.hourly_rate) || 0;
      laborMap[te.work_order_id] = (laborMap[te.work_order_id] || 0) + (hours * rate);
    });

    const rows: JobsReportRow[] = jobs.map((job) => {
      const revenue = revenueMap[job.id] || 0;
      const material_cost = materialMap[job.id] || 0;
      const expense_cost = expenseMap[job.id] || 0;
      const labor_cost = laborMap[job.id] || 0;
      const totalCosts = material_cost + expense_cost + labor_cost;
      const profit = revenue - totalCosts;
      const hasLabor = labor_cost > 0;
      return {
        id: job.id,
        property_name: null,
        description: job.description || null,
        status: job.status || '',
        trade: job.trade || null,
        priority: job.priority || 'normal',
        job_type: job.job_type || null,
        assigned_to_name: job.assigned_to || null,
        scheduled_date: job.scheduled_date || null,
        completed_at: job.completed_at || null,
        revenue,
        material_cost,
        expense_cost,
        labor_cost,
        labor_cost_available: hasLabor,
        profit,
        margin_pct: revenue > 0 ? Math.round((profit / revenue) * 10000) / 100 : null,
      };
    });

    return { data: rows };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load jobs report';
    return { data: [], error: message };
  }
}

// ─── 2. Sales Report ────────────────────────────────────────────────────────

export async function getSalesReport(
  dateRange: ReportDateRange
): Promise<{ data: SalesReportSummary; error?: string }> {
  const empty: SalesReportSummary = {
    total_revenue: 0,
    total_tax: 0,
    avg_invoice_value: 0,
    invoice_count: 0,
    data: [],
  };
  try {
    const { vendor_org_id } = await requireVendorRole();
    const supabase = await createClient();

    const { data: invoices, error } = await supabase
      .from('vendor_invoices')
      .select('id, total, tax_amount, paid_at')
      .eq('vendor_org_id', vendor_org_id)
      .eq('status', 'paid')
      .gte('paid_at', dateRange.start)
      .lte('paid_at', dateRange.end)
      .order('paid_at', { ascending: true });

    if (error) {
      return { data: empty, error: error.message };
    }
    if (!invoices || invoices.length === 0) {
      return { data: empty };
    }

    let totalRevenue = 0;
    let totalTax = 0;
    const dailyMap: Record<string, { revenue: number; tax: number; count: number }> = {};

    invoices.forEach((inv) => {
      const amount = Number(inv.total) || 0;
      const tax = Number(inv.tax_amount) || 0;
      totalRevenue += amount;
      totalTax += tax;

      const dateKey = inv.paid_at ? inv.paid_at.substring(0, 10) : 'unknown';
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { revenue: 0, tax: 0, count: 0 };
      }
      dailyMap[dateKey].revenue += amount;
      dailyMap[dateKey].tax += tax;
      dailyMap[dateKey].count += 1;
    });

    const salesRows: SalesReportRow[] = Object.entries(dailyMap).map(([date, vals]) => ({
      date,
      revenue: vals.revenue,
      tax_collected: vals.tax,
      invoice_count: vals.count,
    }));

    return {
      data: {
        total_revenue: totalRevenue,
        total_tax: totalTax,
        avg_invoice_value: invoices.length > 0 ? totalRevenue / invoices.length : 0,
        invoice_count: invoices.length,
        data: salesRows,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load sales report';
    return { data: empty, error: message };
  }
}

// ─── 3. Estimates Funnel ────────────────────────────────────────────────────

export async function getEstimatesFunnel(
  dateRange: ReportDateRange
): Promise<{ data: EstimatesFunnelSummary; error?: string }> {
  const empty: EstimatesFunnelSummary = {
    total_sent: 0,
    total_approved: 0,
    total_declined: 0,
    approval_rate: 0,
    conversion_rate: 0,
    avg_estimate_value: 0,
    funnel: [],
  };
  try {
    const { vendor_org_id } = await requireVendorRole();
    const supabase = await createClient();

    const { data: estimates, error } = await supabase
      .from('vendor_estimates')
      .select('id, status, total')
      .eq('vendor_org_id', vendor_org_id)
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end);

    if (error) {
      return { data: empty, error: error.message };
    }
    if (!estimates || estimates.length === 0) {
      return { data: empty };
    }

    const statusMap: Record<string, { count: number; value: number }> = {};
    let totalValue = 0;
    let sentCount = 0;
    let approvedCount = 0;
    let declinedCount = 0;

    estimates.forEach((est) => {
      const status = est.status || 'unknown';
      const value = Number(est.total) || 0;
      totalValue += value;

      if (!statusMap[status]) {
        statusMap[status] = { count: 0, value: 0 };
      }
      statusMap[status].count += 1;
      statusMap[status].value += value;

      if (status === 'sent' || status === 'pm_reviewing' || status === 'with_owner') {
        sentCount += 1;
      }
      if (status === 'approved') {
        approvedCount += 1;
      }
      if (status === 'declined') {
        declinedCount += 1;
      }
    });

    const funnel: EstimatesFunnelRow[] = Object.entries(statusMap).map(([status, vals]) => ({
      status,
      count: vals.count,
      total_value: vals.value,
    }));

    const totalCount = estimates.length;

    return {
      data: {
        total_sent: sentCount,
        total_approved: approvedCount,
        total_declined: declinedCount,
        approval_rate: totalCount > 0 ? (approvedCount / totalCount) * 100 : 0,
        conversion_rate: totalCount > 0 ? (approvedCount / totalCount) * 100 : 0,
        avg_estimate_value: totalCount > 0 ? totalValue / totalCount : 0,
        funnel,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load estimates funnel';
    return { data: empty, error: message };
  }
}

// ─── 4. Invoices / Aging Report ─────────────────────────────────────────────

export async function getInvoicesReport(
  dateRange: ReportDateRange
): Promise<{ data: InvoiceAgingSummary; error?: string }> {
  const emptyBuckets: InvoiceAgingBucket[] = [
    { label: '0-30', min_days: 0, max_days: 30, count: 0, total: 0 },
    { label: '31-60', min_days: 31, max_days: 60, count: 0, total: 0 },
    { label: '61-90', min_days: 61, max_days: 90, count: 0, total: 0 },
    { label: '90+', min_days: 91, max_days: null, count: 0, total: 0 },
  ];
  const empty: InvoiceAgingSummary = {
    buckets: emptyBuckets,
    total_outstanding: 0,
    invoices: [],
  };
  try {
    const { vendor_org_id } = await requireVendorRole();
    const supabase = await createClient();

    const { data: invoices, error } = await supabase
      .from('vendor_invoices')
      .select('id, invoice_number, total, status, created_at, due_date')
      .eq('vendor_org_id', vendor_org_id)
      .in('status', ['submitted', 'pm_approved', 'processing', 'disputed'])
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end)
      .order('created_at', { ascending: true });

    if (error) {
      return { data: empty, error: error.message };
    }
    if (!invoices || invoices.length === 0) {
      return { data: empty };
    }

    const now = Date.now();
    const buckets: InvoiceAgingBucket[] = [
      { label: '0-30', min_days: 0, max_days: 30, count: 0, total: 0 },
      { label: '31-60', min_days: 31, max_days: 60, count: 0, total: 0 },
      { label: '61-90', min_days: 61, max_days: 90, count: 0, total: 0 },
      { label: '90+', min_days: 91, max_days: null, count: 0, total: 0 },
    ];
    let totalOutstanding = 0;

    const invoiceRows: InvoiceAgingRow[] = invoices.map((inv) => {
      const createdMs = new Date(inv.created_at).getTime();
      const daysOutstanding = Math.max(0, Math.floor((now - createdMs) / 86400000));
      const amount = Number(inv.total) || 0;
      totalOutstanding += amount;

      // Determine bucket label
      let bucketLabel = '90+';
      for (const bucket of buckets) {
        const maxDays = bucket.max_days ?? 99999;
        if (daysOutstanding >= bucket.min_days && daysOutstanding <= maxDays) {
          bucket.count += 1;
          bucket.total += amount;
          bucketLabel = bucket.label;
          break;
        }
      }

      return {
        id: inv.id,
        invoice_number: inv.invoice_number || null,
        property_name: null,
        pm_name: null,
        submitted_at: inv.created_at,
        due_date: inv.due_date || null,
        total: amount,
        balance_due: amount,
        days_outstanding: daysOutstanding,
        bucket: bucketLabel,
      };
    });

    return {
      data: {
        buckets,
        total_outstanding: totalOutstanding,
        invoices: invoiceRows,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load invoices report';
    return { data: empty, error: message };
  }
}

// ─── 5. Timesheets Report ───────────────────────────────────────────────────

export async function getTimesheetsReport(
  dateRange: ReportDateRange,
  userId?: string
): Promise<{ data: TimesheetSummary; error?: string }> {
  const empty: TimesheetSummary = {
    total_hours: 0,
    total_labor_cost: 0,
    labor_cost_available: false,
    entries: [],
  };
  try {
    const { vendor_org_id } = await requireVendorRole();
    const supabase = await createClient();

    // Join through work orders to scope by vendor_org_id
    let query = supabase
      .from('vendor_wo_time_entries')
      .select('id, work_order_id, user_id, clock_in, clock_out, hourly_rate, notes, vendor_work_orders!inner(vendor_org_id)')
      .eq('vendor_work_orders.vendor_org_id', vendor_org_id)
      .gte('clock_in', dateRange.start)
      .lte('clock_in', dateRange.end);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: entries, error } = await query.order('clock_in', { ascending: false });

    if (error) {
      return { data: empty, error: error.message };
    }
    if (!entries || entries.length === 0) {
      return { data: empty };
    }

    let totalMinutes = 0;
    let totalLaborCost = 0;
    let hasAnyRate = false;

    const entryRows: TimesheetRow[] = entries.map((te) => {
      let durationMinutes = 0;
      if (te.clock_in && te.clock_out) {
        const start = new Date(te.clock_in).getTime();
        const end = new Date(te.clock_out).getTime();
        durationMinutes = Math.max(0, Math.round((end - start) / 60000));
      }
      const hours = durationMinutes / 60;
      const rate = Number(te.hourly_rate) || 0;
      const cost = hours * rate;
      if (rate > 0) hasAnyRate = true;

      totalMinutes += durationMinutes;
      totalLaborCost += cost;

      return {
        vendor_user_id: te.user_id,
        user_name: null,
        work_order_id: te.work_order_id,
        property_name: null,
        clock_in: te.clock_in,
        clock_out: te.clock_out || null,
        duration_minutes: durationMinutes,
        hourly_rate: rate,
        labor_cost: cost,
      };
    });

    return {
      data: {
        total_hours: Math.round((totalMinutes / 60) * 100) / 100,
        total_labor_cost: Math.round(totalLaborCost * 100) / 100,
        labor_cost_available: hasAnyRate,
        entries: entryRows,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load timesheets report';
    return { data: empty, error: message };
  }
}

// ─── 6. Tax Report ──────────────────────────────────────────────────────────

export async function getTaxReport(
  dateRange: ReportDateRange
): Promise<{ data: TaxReportSummary; error?: string }> {
  const empty: TaxReportSummary = {
    total_taxable_sales: 0,
    total_tax_collected: 0,
    effective_tax_rate: null,
    data: [],
  };
  try {
    const { vendor_org_id } = await requireVendorRole();
    const supabase = await createClient();

    const { data: invoices, error } = await supabase
      .from('vendor_invoices')
      .select('id, total, tax_amount, paid_at')
      .eq('vendor_org_id', vendor_org_id)
      .eq('status', 'paid')
      .gte('paid_at', dateRange.start)
      .lte('paid_at', dateRange.end)
      .order('paid_at', { ascending: true });

    if (error) {
      return { data: empty, error: error.message };
    }
    if (!invoices || invoices.length === 0) {
      return { data: empty };
    }

    const monthMap: Record<string, { taxable_sales: number; tax_collected: number; invoice_count: number }> = {};
    let totalTaxableSales = 0;
    let totalTaxCollected = 0;

    invoices.forEach((inv) => {
      const sales = Number(inv.total) || 0;
      const tax = Number(inv.tax_amount) || 0;
      totalTaxableSales += sales;
      totalTaxCollected += tax;

      const monthKey = inv.paid_at ? inv.paid_at.substring(0, 7) : 'unknown';
      if (!monthMap[monthKey]) {
        monthMap[monthKey] = { taxable_sales: 0, tax_collected: 0, invoice_count: 0 };
      }
      monthMap[monthKey].taxable_sales += sales;
      monthMap[monthKey].tax_collected += tax;
      monthMap[monthKey].invoice_count += 1;
    });

    const months: TaxReportRow[] = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, vals]) => ({
        month,
        taxable_sales: vals.taxable_sales,
        tax_collected: vals.tax_collected,
        invoice_count: vals.invoice_count,
      }));

    return {
      data: {
        total_taxable_sales: totalTaxableSales,
        total_tax_collected: totalTaxCollected,
        effective_tax_rate: totalTaxableSales > 0 ? (totalTaxCollected / totalTaxableSales) * 100 : null,
        data: months,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load tax report';
    return { data: empty, error: message };
  }
}
