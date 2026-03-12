"use server";

import { createClient } from "@/lib/supabase/server";
import { matchVendor } from "@/lib/vendor/match-vendor";
import type { Urgency } from "@/lib/vendor/match-vendor";
import {
  notifyVendorNewWO,
  notifyHomeownerSubmission,
} from "./home-wo-notifications";

interface TradeInput {
  trade: string;
  scope: string;
  sequence_order: number;
  depends_on: number[];
}

interface SubmitProjectInput {
  title: string;
  description: string;
  property_id: string;
  template_name?: string;
  trades: TradeInput[];
  estimated_duration_days?: number;
  estimated_cost_low?: number;
  estimated_cost_high?: number;
}

/**
 * Create a multi-trade project and spawn WOs for independent trades.
 */
export async function submitProject(
  input: SubmitProjectInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not authenticated" };
    if (!input.trades.length)
      return { success: false, error: "At least one trade is required" };

    // Create the project
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .insert({
        homeowner_id: user.id,
        property_id: input.property_id,
        title: input.title,
        description: input.description,
        template_name: input.template_name ?? null,
        total_trades: input.trades.length,
        completed_trades: 0,
        estimated_duration_days: input.estimated_duration_days ?? null,
        estimated_cost_low: input.estimated_cost_low ?? null,
        estimated_cost_high: input.estimated_cost_high ?? null,
        status: "active",
      })
      .select("id")
      .single();

    if (projErr) {
      console.error("Failed to create project:", projErr);
      return { success: false, error: projErr.message };
    }

    // Create thread for project messaging
    await supabase.from("project_threads").insert({
      project_id: project.id,
    });

    // Create WOs for each trade
    const woInserts = input.trades.map((t) => ({
      homeowner_id: user.id,
      homeowner_property_id: input.property_id,
      source_type: "project_trade" as const,
      lead_source: "homeowner_project" as const,
      origin_module: "home" as const,
      project_id: project.id,
      trade: t.trade,
      description: t.scope,
      urgency: "routine" as const,
      vendor_selection_mode: "auto_match",
      sequence_order: t.sequence_order,
      depends_on: t.depends_on,
      status: t.depends_on.length === 0 ? "matching" : "on_hold",
      priority: "normal" as const,
    }));

    const { data: wos, error: woErr } = await supabase
      .from("vendor_work_orders")
      .insert(woInserts)
      .select("id, trade, description, status, sequence_order");

    if (woErr) {
      console.error("Failed to create project WOs:", woErr);
      return { success: false, error: woErr.message };
    }

    // Run matching on trades with no dependencies (status = "matching")
    const readyWOs = (wos ?? []).filter((wo) => wo.status === "matching");
    for (const wo of readyWOs) {
      try {
        const { vendorOrgId } = await matchVendor({
          woId: wo.id,
          trade: wo.trade,
          urgency: "routine" as Urgency,
          selectionMode: "auto_match",
          homeownerId: user.id,
        });

        if (vendorOrgId) {
          await supabase
            .from("vendor_work_orders")
            .update({ vendor_org_id: vendorOrgId, status: "assigned" })
            .eq("id", wo.id);

          await notifyVendorNewWO({
            woId: wo.id,
            vendorOrgId,
            trade: wo.trade,
            description: wo.description ?? "",
            urgency: "routine",
          });
        }
      } catch (err) {
        console.error(`Matching failed for WO ${wo.id}:`, err);
      }
    }

    // Notify homeowner
    await notifyHomeownerSubmission({
      homeownerId: user.id,
      woId: project.id,
      trade: `Project: ${input.title}`,
      vendorAssigned: readyWOs.length > 0,
    });

    return { success: true, id: project.id };
  } catch (err) {
    console.error("submitProject error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Something went wrong",
    };
  }
}

/**
 * List homeowner projects.
 */
export async function getHomeProjects(
  status?: string,
  page = 1,
  pageSize = 25
): Promise<{
  success: boolean;
  data?: Array<{
    id: string;
    title: string;
    description: string | null;
    status: string;
    template_name: string | null;
    total_trades: number;
    completed_trades: number;
    estimated_cost_low: number | null;
    estimated_cost_high: number | null;
    created_at: string;
  }>;
  total: number;
  page: number;
  pageSize: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, total: 0, page: 1, pageSize: 25, error: "Not authenticated" };

    const safePage = Math.max(1, page);
    const safeSize = Math.min(Math.max(1, pageSize), 100);
    const from = (safePage - 1) * safeSize;
    const to = from + safeSize - 1;

    let query = supabase
      .from("projects")
      .select(
        "id, title, description, status, template_name, total_trades, completed_trades, estimated_cost_low, estimated_cost_high, created_at",
        { count: "exact" }
      )
      .eq("homeowner_id", user.id)
      .range(from, to)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, count, error } = await query;

    if (error) return { success: false, total: 0, page: safePage, pageSize: safeSize, error: error.message };
    return { success: true, data: data ?? [], total: count ?? 0, page: safePage, pageSize: safeSize };
  } catch (err) {
    return {
      success: false,
      total: 0,
      page: Math.max(1, page),
      pageSize: Math.min(Math.max(1, pageSize), 100),
      error: err instanceof Error ? err.message : "Something went wrong",
    };
  }
}

/**
 * Get project detail with all work orders.
 */
export async function getHomeProject(projectId: string): Promise<{
  success: boolean;
  data?: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    template_name: string | null;
    total_trades: number;
    completed_trades: number;
    estimated_duration_days: number | null;
    estimated_cost_low: number | null;
    estimated_cost_high: number | null;
    actual_cost: number | null;
    created_at: string;
    work_orders: Array<{
      id: string;
      trade: string;
      description: string | null;
      status: string;
      sequence_order: number | null;
      depends_on: number[] | null;
      vendor_org_id: string | null;
      created_at: string;
    }>;
  };
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not authenticated" };

    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select(
        "id, title, description, status, template_name, total_trades, completed_trades, estimated_duration_days, estimated_cost_low, estimated_cost_high, actual_cost, created_at"
      )
      .eq("id", projectId)
      .eq("homeowner_id", user.id)
      .single();

    if (projErr) return { success: false, error: projErr.message };

    const { data: wos } = await supabase
      .from("vendor_work_orders")
      .select(
        "id, trade, description, status, sequence_order, depends_on, vendor_org_id, created_at"
      )
      .eq("project_id", projectId)
      .order("sequence_order", { ascending: true });

    return {
      success: true,
      data: {
        ...project,
        work_orders: wos ?? [],
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Something went wrong",
    };
  }
}

/**
 * Get project templates for the "new project" form.
 */
export async function getProjectTemplates(): Promise<{
  success: boolean;
  data?: Array<{
    id: string;
    name: string;
    display_name: string;
    description: string | null;
    trades: Array<{
      order: number;
      trade: string;
      scope: string;
      depends_on: number[];
    }>;
    avg_duration_days: number | null;
    avg_cost_low: number | null;
    avg_cost_high: number | null;
  }>;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("project_templates")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) return { success: false, error: error.message };
    return { success: true, data: data ?? [] };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Something went wrong",
    };
  }
}

/**
 * Activate next trades when a WO completes within a project.
 * Called from vendor-work-orders.ts when a project WO status = "completed".
 */
export async function activateNextTrades(
  projectId: string,
  completedSequenceOrder: number
): Promise<void> {
  const supabase = await createClient();

  // Get all project WOs
  const { data: allWOs } = await supabase
    .from("vendor_work_orders")
    .select("id, trade, description, status, sequence_order, depends_on, homeowner_id")
    .eq("project_id", projectId);

  if (!allWOs || allWOs.length === 0) return;

  // Build set of completed sequence_orders
  const completedOrders = new Set(
    allWOs
      .filter((wo) => wo.status === "completed")
      .map((wo) => wo.sequence_order)
      .filter((o): o is number => o !== null)
  );
  // Add the one just completed (may not be in DB yet as "completed")
  completedOrders.add(completedSequenceOrder);

  // Find on_hold WOs whose dependencies are all complete
  const newlyReady = allWOs.filter((wo) => {
    if (wo.status !== "on_hold") return false;
    const deps = wo.depends_on ?? [];
    return deps.length > 0 && deps.every((d: number) => completedOrders.has(d));
  });

  // Activate each ready WO
  for (const wo of newlyReady) {
    await supabase
      .from("vendor_work_orders")
      .update({ status: "matching" })
      .eq("id", wo.id);

    try {
      const { matchVendor: runMatch } = await import(
        "@/lib/vendor/match-vendor"
      );
      const { vendorOrgId } = await runMatch({
        woId: wo.id,
        trade: wo.trade,
        urgency: "routine" as Urgency,
        selectionMode: "auto_match",
        homeownerId: wo.homeowner_id,
      });

      if (vendorOrgId) {
        await supabase
          .from("vendor_work_orders")
          .update({ vendor_org_id: vendorOrgId, status: "assigned" })
          .eq("id", wo.id);

        const { notifyVendorNewWO: notifyVendor } = await import(
          "./home-wo-notifications"
        );
        await notifyVendor({
          woId: wo.id,
          vendorOrgId,
          trade: wo.trade,
          description: wo.description ?? "",
          urgency: "routine",
        });
      }
    } catch (err) {
      console.error(`Matching failed for activated WO ${wo.id}:`, err);
    }
  }

  // Update project completed_trades count
  const completedCount = allWOs.filter(
    (wo) =>
      wo.status === "completed" ||
      wo.sequence_order === completedSequenceOrder
  ).length;

  const totalTrades = allWOs.length;
  const projectUpdate: Record<string, unknown> = {
    completed_trades: completedCount,
    updated_at: new Date().toISOString(),
  };

  if (completedCount >= totalTrades) {
    projectUpdate.status = "complete";
  }

  await supabase
    .from("projects")
    .update(projectUpdate)
    .eq("id", projectId);
}
