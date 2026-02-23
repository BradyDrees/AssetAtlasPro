'use server';

import { createClient } from '@/lib/supabase/server';
import { requireVendorRole, logActivity } from '@/lib/vendor/role-helpers';
import type {
  VendorExpense,
  CreateExpenseInput,
  UpdateExpenseInput,
  ExpenseCategorySummary,
  JobProfitability,
} from '@/lib/vendor/expense-types';

// ---------- Get Vendor Expenses -------------------------------------------

export async function getVendorExpenses(filters?: {
  dateFrom?: string;
  dateTo?: string;
  category?: string;
  work_order_id?: string;
}): Promise<{ data: VendorExpense[]; error?: string }> {
  try {
    const { vendor_org_id } = await requireVendorRole();
    const supabase = await createClient();

    let query = supabase
      .from('vendor_expenses')
      .select('*')
      .eq('vendor_org_id', vendor_org_id)
      .order('date', { ascending: false });

    if (filters?.dateFrom) {
      query = query.gte('date', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('date', filters.dateTo);
    }
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.work_order_id) {
      query = query.eq('work_order_id', filters.work_order_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[getVendorExpenses] DB error:', error.message);
      return { data: [], error: error.message };
    }

    return { data: (data as VendorExpense[]) ?? [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch expenses';
    console.error('[getVendorExpenses] Error:', message);
    return { data: [], error: message };
  }
}

// ---------- Create Expense ------------------------------------------------

export async function createExpense(
  input: CreateExpenseInput
): Promise<{ data?: VendorExpense; error?: string }> {
  try {
    const { vendor_org_id, id: vendorUserId } = await requireVendorRole();
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    const row = {
      vendor_org_id,
      created_by: user.id,
      description: input.description,
      amount: input.amount,
      category: input.category,
      date: input.date,
      work_order_id: input.work_order_id ?? null,
      notes: input.notes ?? null,
      is_reimbursable: input.is_reimbursable ?? false,
    };

    const { data, error } = await supabase
      .from('vendor_expenses')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('[createExpense] DB error:', error.message);
      return { error: error.message };
    }

    await logActivity({
      action: 'expense_created',
      entityType: 'expense',
      entityId: data.id,
      metadata: { description: input.description, amount: input.amount, category: input.category },
    });

    return { data: data as VendorExpense };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create expense';
    console.error('[createExpense] Error:', message);
    return { error: message };
  }
}

// ---------- Update Expense ------------------------------------------------

export async function updateExpense(
  id: string,
  updates: UpdateExpenseInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const { vendor_org_id } = await requireVendorRole();
    const supabase = await createClient();

    const { error } = await supabase
      .from('vendor_expenses')
      .update(updates)
      .eq('id', id)
      .eq('vendor_org_id', vendor_org_id);

    if (error) {
      console.error('[updateExpense] DB error:', error.message);
      return { success: false, error: error.message };
    }

    await logActivity({
      action: 'expense_updated',
      entityType: 'expense',
      entityId: id,
      metadata: { fields_updated: Object.keys(updates) },
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update expense';
    console.error('[updateExpense] Error:', message);
    return { success: false, error: message };
  }
}

// ---------- Delete Expense ------------------------------------------------

export async function deleteExpense(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { vendor_org_id } = await requireVendorRole();
    const supabase = await createClient();

    // Fetch the expense before deleting for activity log context
    const { data: existing } = await supabase
      .from('vendor_expenses')
      .select('description, amount, category')
      .eq('id', id)
      .eq('vendor_org_id', vendor_org_id)
      .single();

    const { error } = await supabase
      .from('vendor_expenses')
      .delete()
      .eq('id', id)
      .eq('vendor_org_id', vendor_org_id);

    if (error) {
      console.error('[deleteExpense] DB error:', error.message);
      return { success: false, error: error.message };
    }

    await logActivity({
      action: 'expense_deleted',
      entityType: 'expense',
      entityId: id,
      metadata: existing
        ? { description: existing.description, amount: existing.amount, category: existing.category }
        : { id },
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete expense';
    console.error('[deleteExpense] Error:', message);
    return { success: false, error: message };
  }
}

// ---------- Expense Summary by Category -----------------------------------

export async function getExpenseSummary(
  dateFrom?: string,
  dateTo?: string
): Promise<{ data: ExpenseCategorySummary[]; error?: string }> {
  try {
    const { vendor_org_id } = await requireVendorRole();
    const supabase = await createClient();

    let query = supabase
      .from('vendor_expenses')
      .select('category, amount')
      .eq('vendor_org_id', vendor_org_id);

    if (dateFrom) {
      query = query.gte('date', dateFrom);
    }
    if (dateTo) {
      query = query.lte('date', dateTo);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[getExpenseSummary] DB error:', error.message);
      return { data: [], error: error.message };
    }

    if (!data || data.length === 0) {
      return { data: [] };
    }

    // Group by category and compute totals
    const categoryMap = new Map<string, { total: number; count: number }>();

    for (const row of data) {
      const cat = row.category || 'uncategorized';
      const existing = categoryMap.get(cat);
      if (existing) {
        existing.total += Number(row.amount) || 0;
        existing.count += 1;
      } else {
        categoryMap.set(cat, { total: Number(row.amount) || 0, count: 1 });
      }
    }

    const summaries: ExpenseCategorySummary[] = Array.from(categoryMap.entries()).map(
      ([category, { total, count }]) => ({
        category: category as ExpenseCategorySummary['category'],
        total: Math.round(total * 100) / 100,
        count,
      })
    );

    // Sort by total descending
    summaries.sort((a, b) => b.total - a.total);

    return { data: summaries };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch expense summary';
    console.error('[getExpenseSummary] Error:', message);
    return { data: [], error: message };
  }
}

// ---------- Job Profitability ---------------------------------------------

export async function getJobProfitability(
  woId: string
): Promise<{ data?: JobProfitability; error?: string }> {
  try {
    const { vendor_org_id } = await requireVendorRole();
    const supabase = await createClient();

    // Revenue: sum of paid invoices for this work order
    const { data: invoices, error: invError } = await supabase
      .from('vendor_invoices')
      .select('total')
      .eq('work_order_id', woId)
      .eq('vendor_org_id', vendor_org_id)
      .eq('status', 'paid');

    if (invError) {
      console.error('[getJobProfitability] Invoice query error:', invError.message);
      return { error: invError.message };
    }

    const revenue = (invoices ?? []).reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

    // Materials: sum from vendor_wo_materials
    const { data: materials, error: matError } = await supabase
      .from('vendor_wo_materials')
      .select('total_cost')
      .eq('work_order_id', woId)
      .eq('vendor_org_id', vendor_org_id);

    if (matError) {
      console.error('[getJobProfitability] Materials query error:', matError.message);
      return { error: matError.message };
    }

    const materialsCost = (materials ?? []).reduce(
      (sum, mat) => sum + (Number(mat.total_cost) || 0),
      0
    );

    // Expenses: sum from vendor_expenses for this work order
    const { data: expenses, error: expError } = await supabase
      .from('vendor_expenses')
      .select('amount')
      .eq('work_order_id', woId)
      .eq('vendor_org_id', vendor_org_id);

    if (expError) {
      console.error('[getJobProfitability] Expenses query error:', expError.message);
      return { error: expError.message };
    }

    const expensesCost = (expenses ?? []).reduce(
      (sum, exp) => sum + (Number(exp.amount) || 0),
      0
    );

    // Labor: sum of time entries x hourly_rate
    const { data: timeEntries, error: timeError } = await supabase
      .from('vendor_wo_time')
      .select('hours, hourly_rate')
      .eq('work_order_id', woId)
      .eq('vendor_org_id', vendor_org_id);

    if (timeError) {
      console.error('[getJobProfitability] Time query error:', timeError.message);
      return { error: timeError.message };
    }

    let laborCost = 0;
    let laborCostAvailable = false;

    if (timeEntries && timeEntries.length > 0) {
      const entriesWithRate = timeEntries.filter(
        (entry) => entry.hourly_rate != null && Number(entry.hourly_rate) > 0
      );

      if (entriesWithRate.length > 0) {
        laborCostAvailable = true;
        laborCost = entriesWithRate.reduce(
          (sum, entry) => sum + (Number(entry.hours) || 0) * (Number(entry.hourly_rate) || 0),
          0
        );
      }
    }

    // Calculate profit and margin
    const totalCosts = materialsCost + expensesCost + (laborCostAvailable ? laborCost : 0);
    const profit = revenue - totalCosts;
    const marginPct = revenue > 0 ? Math.round((profit / revenue) * 10000) / 100 : null;

    const result: JobProfitability = {
      work_order_id: woId,
      revenue: Math.round(revenue * 100) / 100,
      material_cost: Math.round(materialsCost * 100) / 100,
      expense_cost: Math.round(expensesCost * 100) / 100,
      labor_cost: Math.round(laborCost * 100) / 100,
      labor_cost_available: laborCostAvailable,
      profit: Math.round(profit * 100) / 100,
      margin_pct: marginPct,
    };

    return { data: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to calculate profitability';
    console.error('[getJobProfitability] Error:', message);
    return { error: message };
  }
}
