"use server";

import { createClient } from "@/lib/supabase/server";
import { isStripeConfigured } from "@/lib/stripe/stripe-client";
import {
  SUBSCRIPTION_PLANS,
  type SubscriptionPlanKey,
} from "@/lib/subscription-plans";

// ============================================
// Subscription Management
// ============================================

/**
 * Create a subscription for a homeowner property.
 * If Stripe is not configured, creates a "mock" active subscription
 * so the rest of the app (pool, matching, etc.) still works.
 */
export async function createSubscription(input: {
  plan: SubscriptionPlanKey;
  propertyId: string;
}): Promise<{ success: boolean; clientSecret?: string | null; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Check for existing subscription on this property
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("property_id", input.propertyId)
      .maybeSingle();

    if (existing?.status === "active") {
      return { success: false, error: "Active subscription already exists for this property" };
    }

    const planConfig = SUBSCRIPTION_PLANS[input.plan];
    let stripeCustomerId: string | null = null;
    let stripeSubscriptionId: string | null = null;
    let clientSecret: string | null = null;

    if (isStripeConfigured()) {
      // Get user email for Stripe customer
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      const { createStripeCustomer } = await import(
        "@/lib/stripe/create-customer"
      );
      stripeCustomerId = await createStripeCustomer({
        email: profile?.email ?? user.email ?? "",
        name: profile?.full_name ?? "Homeowner",
        userId: user.id,
      });

      const { createStripeSubscription } = await import(
        "@/lib/stripe/create-subscription"
      );
      const result = await createStripeSubscription({
        customerId: stripeCustomerId,
        plan: input.plan,
        propertyId: input.propertyId,
      });
      stripeSubscriptionId = result.subscriptionId;
      clientSecret = result.clientSecret;
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // Upsert subscription
    if (existing) {
      await supabase
        .from("subscriptions")
        .update({
          plan: input.plan,
          status: "active",
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId,
          monthly_amount: planConfig.monthly_amount,
          pool_deposit_amount: planConfig.pool_deposit_amount,
          platform_fee_amount: planConfig.platform_fee_amount,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("subscriptions").insert({
        user_id: user.id,
        property_id: input.propertyId,
        plan: input.plan,
        status: "active",
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        monthly_amount: planConfig.monthly_amount,
        pool_deposit_amount: planConfig.pool_deposit_amount,
        platform_fee_amount: planConfig.platform_fee_amount,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
      });
    }

    // Create or update maintenance pool for this property
    const { data: existingPool } = await supabase
      .from("maintenance_pools")
      .select("id")
      .eq("user_id", user.id)
      .eq("property_id", input.propertyId)
      .maybeSingle();

    if (existingPool) {
      // Add initial deposit to existing pool
      await supabase
        .from("maintenance_pools")
        .update({
          balance: planConfig.pool_deposit_amount,
          total_deposited: planConfig.pool_deposit_amount,
          updated_at: now.toISOString(),
        })
        .eq("id", existingPool.id);
    } else {
      const { data: pool } = await supabase
        .from("maintenance_pools")
        .insert({
          user_id: user.id,
          property_id: input.propertyId,
          balance: planConfig.pool_deposit_amount,
          total_deposited: planConfig.pool_deposit_amount,
          total_spent: 0,
        })
        .select("id")
        .single();

      // Log initial deposit transaction
      if (pool) {
        await supabase.from("pool_transactions").insert({
          pool_id: pool.id,
          type: "deposit",
          amount: planConfig.pool_deposit_amount,
          description: `Initial ${planConfig.name} plan deposit`,
          reference_type: "subscription",
        });
      }
    }

    return { success: true, clientSecret };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Something went wrong",
    };
  }
}

/**
 * Cancel a subscription for a property.
 */
export async function cancelSubscription(
  propertyId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("id, stripe_subscription_id")
      .eq("user_id", user.id)
      .eq("property_id", propertyId)
      .eq("status", "active")
      .single();

    if (!sub) return { success: false, error: "No active subscription found" };

    // Cancel in Stripe if configured
    if (sub.stripe_subscription_id && isStripeConfigured()) {
      const { getStripe } = await import("@/lib/stripe/stripe-client");
      const stripe = getStripe();
      await stripe.subscriptions.cancel(sub.stripe_subscription_id);
    }

    await supabase
      .from("subscriptions")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", sub.id);

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Something went wrong",
    };
  }
}

/**
 * Pause a subscription.
 */
export async function pauseSubscription(
  propertyId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "paused", updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("property_id", propertyId)
      .eq("status", "active");

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Something went wrong",
    };
  }
}

/**
 * Resume a paused subscription.
 */
export async function resumeSubscription(
  propertyId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("property_id", propertyId)
      .eq("status", "paused");

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Something went wrong",
    };
  }
}

/**
 * Get subscription status for a property.
 */
export async function getSubscriptionStatus(propertyId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .eq("property_id", propertyId)
    .maybeSingle();

  return data;
}

/**
 * Get all subscriptions for the current user.
 */
export async function getMySubscriptions() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("subscriptions")
    .select("*, homeowner_properties(id, name, address)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return data ?? [];
}

/**
 * Get pool balance for a property.
 */
export async function getPoolBalance(propertyId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("maintenance_pools")
    .select("*")
    .eq("user_id", user.id)
    .eq("property_id", propertyId)
    .maybeSingle();

  return data;
}

/**
 * Get pool transactions for a property.
 */
export async function getPoolTransactions(propertyId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Get pool id first
  const { data: pool } = await supabase
    .from("maintenance_pools")
    .select("id")
    .eq("user_id", user.id)
    .eq("property_id", propertyId)
    .maybeSingle();

  if (!pool) return [];

  const { data } = await supabase
    .from("pool_transactions")
    .select("*")
    .eq("pool_id", pool.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return data ?? [];
}
