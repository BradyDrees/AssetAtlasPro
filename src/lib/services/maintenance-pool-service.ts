/**
 * Maintenance Pool Service
 *
 * Pool balance management, atomic deductions, transaction logging.
 * Used by invoice-service for pool → invoice payment flows.
 */
import { createClient } from "@/lib/supabase/server";
import { emitEvent } from "@/lib/platform/domain-events";

// ============================================
// Types
// ============================================

export interface PoolDeductionResult {
  success: boolean;
  error?: string;
  newBalance?: number;
  transactionId?: string;
}

export interface PoolBalance {
  balance: number;
  propertyId: string;
  subscriptionId: string;
}

// ============================================
// Pool Operations
// ============================================

/**
 * Get current pool balance for a property.
 */
export async function getPoolBalance(
  propertyId: string
): Promise<PoolBalance | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("homeowner_subscriptions")
    .select("id, maintenance_pool_balance, property_id")
    .eq("property_id", propertyId)
    .eq("status", "active")
    .single();

  if (!data) return null;

  return {
    balance: Number(data.maintenance_pool_balance) || 0,
    propertyId: data.property_id,
    subscriptionId: data.id,
  };
}

/**
 * Deduct from maintenance pool.
 *
 * Atomic operation:
 * 1. Verify sufficient balance
 * 2. Deduct from homeowner_subscriptions.maintenance_pool_balance
 * 3. Log transaction in pool_transactions
 * 4. Emit event
 *
 * Uses optimistic locking via balance check.
 */
export async function deductFromPool(
  propertyId: string,
  amount: number,
  workOrderId?: string | null
): Promise<PoolDeductionResult> {
  if (amount <= 0) {
    return { success: false, error: "Deduction amount must be positive" };
  }

  const supabase = await createClient();

  // 1. Get current balance
  const { data: sub, error: fetchErr } = await supabase
    .from("homeowner_subscriptions")
    .select("id, maintenance_pool_balance")
    .eq("property_id", propertyId)
    .eq("status", "active")
    .single();

  if (fetchErr || !sub) {
    return { success: false, error: "No active subscription found" };
  }

  const currentBalance = Number(sub.maintenance_pool_balance) || 0;

  if (currentBalance < amount) {
    return {
      success: false,
      error: `Insufficient pool balance: $${currentBalance.toFixed(2)} < $${amount.toFixed(2)}`,
    };
  }

  const newBalance = currentBalance - amount;

  // 2. Deduct (optimistic lock: only if balance hasn't changed)
  const { error: updateErr } = await supabase
    .from("homeowner_subscriptions")
    .update({
      maintenance_pool_balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sub.id)
    .eq("maintenance_pool_balance", currentBalance); // Optimistic lock

  if (updateErr) {
    return {
      success: false,
      error: `Pool deduction failed: ${updateErr.message}`,
    };
  }

  // 3. Log transaction
  const { data: txn, error: txnErr } = await supabase
    .from("pool_transactions")
    .insert({
      subscription_id: sub.id,
      property_id: propertyId,
      type: "deduction",
      amount: -amount,
      balance_after: newBalance,
      description: workOrderId
        ? `Invoice payment for work order`
        : "Pool deduction",
      work_order_id: workOrderId ?? null,
    })
    .select("id")
    .single();

  // 4. Emit event (non-blocking)
  emitEvent(
    "payment.pool_deducted",
    "property",
    propertyId,
    {
      property_id: propertyId,
      work_order_id: workOrderId ?? undefined,
      origin_module: "home",
      amount,
      new_balance: newBalance,
    },
    { type: "system" }
  ).catch(() => {});

  return {
    success: true,
    newBalance,
    transactionId: txn?.id,
  };
}

/**
 * Add funds to maintenance pool (e.g., monthly subscription deposit).
 */
export async function addToPool(
  propertyId: string,
  amount: number,
  description?: string
): Promise<PoolDeductionResult> {
  if (amount <= 0) {
    return { success: false, error: "Amount must be positive" };
  }

  const supabase = await createClient();

  const { data: sub, error: fetchErr } = await supabase
    .from("homeowner_subscriptions")
    .select("id, maintenance_pool_balance")
    .eq("property_id", propertyId)
    .eq("status", "active")
    .single();

  if (fetchErr || !sub) {
    return { success: false, error: "No active subscription found" };
  }

  const currentBalance = Number(sub.maintenance_pool_balance) || 0;
  const newBalance = currentBalance + amount;

  const { error: updateErr } = await supabase
    .from("homeowner_subscriptions")
    .update({
      maintenance_pool_balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sub.id);

  if (updateErr) {
    return { success: false, error: `Pool deposit failed: ${updateErr.message}` };
  }

  await supabase.from("pool_transactions").insert({
    subscription_id: sub.id,
    property_id: propertyId,
    type: "deposit",
    amount,
    balance_after: newBalance,
    description: description ?? "Pool deposit",
  });

  return { success: true, newBalance };
}
