import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend-client";
import {
  invoiceOverdueEmail,
  estimateFollowUpEmail,
  reviewRequestEmail,
  reviewReminderEmail,
} from "@/lib/email/templates";
import { withTimeout, CRON_TIMEOUT_MS } from "@/lib/server-utils";

/**
 * Auto Follow-Ups Cron — runs daily at 9 AM
 *
 * 1. Invoice overdue reminders (3, 7, 14, 30 days)
 * 2. Estimate review reminders (3, 7 days)
 * 3. Review request after job completion (24h+)
 */
export async function GET(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return await withTimeout(() => handleAutoFollowups(), CRON_TIMEOUT_MS);
  } catch (err) {
    console.error("[auto-followups] Timeout or fatal error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

async function handleAutoFollowups() {
  const supabase = createServiceClient();
  const now = new Date();
  const results = {
    invoiceReminders: 0, estimateReminders: 0, reviewRequests: 0,
    skipped: { invoices: 0, estimates: 0, reviews: 0 },
    errors: [] as string[],
  };

  // ─── 1. Invoice Overdue Reminders ───
  try {
    // Find non-draft, non-paid invoices that are past due
    const { data: overdueInvoices } = await supabase
      .from("vendor_invoices")
      .select("id, invoice_number, total, due_date, pm_user_id, vendor_org_id, last_reminded_at, reminder_count, status")
      .in("status", ["submitted", "pm_approved", "processing"])
      .not("due_date", "is", null)
      .lt("due_date", now.toISOString().split("T")[0])
      .order("created_at", { ascending: true })
      .limit(200);

    // Batch-fetch PM profiles and vendor orgs to avoid N+1 queries
    const invPmIds = [...new Set((overdueInvoices ?? []).map((i) => i.pm_user_id).filter(Boolean))] as string[];
    const invOrgIds = [...new Set((overdueInvoices ?? []).map((i) => i.vendor_org_id).filter(Boolean))] as string[];

    const pmProfileMap = new Map<string, { email: string | null }>();
    if (invPmIds.length > 0) {
      const { data: pmProfiles } = await supabase.from("profiles").select("id, email").in("id", invPmIds);
      for (const p of pmProfiles ?? []) pmProfileMap.set(p.id, { email: p.email });
    }

    const orgNameMap = new Map<string, string>();
    if (invOrgIds.length > 0) {
      const { data: orgs } = await supabase.from("vendor_organizations").select("id, name").in("id", invOrgIds);
      for (const o of orgs ?? []) orgNameMap.set(o.id, o.name);
    }

    for (const inv of overdueInvoices ?? []) {
      const dueDate = new Date(inv.due_date + "T00:00:00");
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      // Determine reminder tier
      let shouldRemind = false;
      if (daysOverdue >= 30 && (inv.reminder_count ?? 0) < 4) shouldRemind = true;
      else if (daysOverdue >= 14 && (inv.reminder_count ?? 0) < 3) shouldRemind = true;
      else if (daysOverdue >= 7 && (inv.reminder_count ?? 0) < 2) shouldRemind = true;
      else if (daysOverdue >= 3 && (inv.reminder_count ?? 0) < 1) shouldRemind = true;

      // Skip if recently reminded (within 3 days)
      if (inv.last_reminded_at) {
        const lastReminded = new Date(inv.last_reminded_at);
        const daysSinceReminder = (now.getTime() - lastReminded.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceReminder < 3) shouldRemind = false;
      }

      if (!shouldRemind) { results.skipped.invoices++; continue; }

      // Get PM email for notification (from batch map)
      if (inv.pm_user_id) {
        const pmProfile = pmProfileMap.get(inv.pm_user_id);

        if (pmProfile?.email) {
          const vendorName = orgNameMap.get(inv.vendor_org_id) ?? "Vendor";

          const email = invoiceOverdueEmail({
            invoiceNumber: inv.invoice_number ?? inv.id.slice(0, 8),
            amount: `$${Number(inv.total).toLocaleString()}`,
            daysOverdue,
            vendorName,
          });

          await sendEmail({
            to: pmProfile.email,
            subject: email.subject,
            html: email.html,
          });
        }

        // In-app notification
        await supabase.from("vendor_notifications").insert({
          user_id: inv.pm_user_id,
          type: "invoice_overdue",
          title: `Invoice #${inv.invoice_number ?? ""} is ${daysOverdue} days overdue`,
          body: `Amount: $${Number(inv.total).toLocaleString()}`,
          reference_type: "invoice",
          reference_id: inv.id,
        });
      }

      // Update reminder tracking
      await supabase
        .from("vendor_invoices")
        .update({
          last_reminded_at: now.toISOString(),
          reminder_count: (inv.reminder_count ?? 0) + 1,
        })
        .eq("id", inv.id);

      results.invoiceReminders++;
    }
  } catch (err) {
    results.errors.push(`Invoice reminders: ${err instanceof Error ? err.message : "Unknown error"}`);
  }

  // ─── 2. Estimate Review Reminders ───
  try {
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();

    const { data: pendingEstimates } = await supabase
      .from("vendor_estimates")
      .select("id, estimate_number, title, vendor_org_id, pm_user_id, last_reminded_at, reminder_count, sent_at, status")
      .in("status", ["sent", "pm_reviewing"])
      .lt("sent_at", threeDaysAgo)
      .or("reminder_count.is.null,reminder_count.lt.2")
      .order("created_at", { ascending: true })
      .limit(200);

    // Batch-fetch PM profiles and vendor orgs to avoid N+1 queries
    const estPmIds = [...new Set((pendingEstimates ?? []).map((e) => e.pm_user_id).filter(Boolean))] as string[];
    const estOrgIds = [...new Set((pendingEstimates ?? []).map((e) => e.vendor_org_id).filter(Boolean))] as string[];

    const estPmMap = new Map<string, { email: string | null }>();
    if (estPmIds.length > 0) {
      const { data: pmProfiles } = await supabase.from("profiles").select("id, email").in("id", estPmIds);
      for (const p of pmProfiles ?? []) estPmMap.set(p.id, { email: p.email });
    }

    const estOrgMap = new Map<string, string>();
    if (estOrgIds.length > 0) {
      const { data: orgs } = await supabase.from("vendor_organizations").select("id, name").in("id", estOrgIds);
      for (const o of orgs ?? []) estOrgMap.set(o.id, o.name);
    }

    for (const est of pendingEstimates ?? []) {
      if ((est.reminder_count ?? 0) >= 2) { results.skipped.estimates++; continue; }

      // Skip if recently reminded (within 3 days)
      if (est.last_reminded_at) {
        const lastReminded = new Date(est.last_reminded_at);
        const daysSinceReminder = (now.getTime() - lastReminded.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceReminder < 3) { results.skipped.estimates++; continue; }
      }

      if (est.pm_user_id) {
        const pmProfile = estPmMap.get(est.pm_user_id);

        if (pmProfile?.email) {
          const vendorName = estOrgMap.get(est.vendor_org_id) ?? "Vendor";

          const email = estimateFollowUpEmail({
            estimateNumber: est.estimate_number ?? est.id.slice(0, 8),
            vendorName,
          });

          await sendEmail({
            to: pmProfile.email,
            subject: email.subject,
            html: email.html,
          });
        }

        // In-app notification
        await supabase.from("vendor_notifications").insert({
          user_id: est.pm_user_id,
          type: "estimate_followup",
          title: `Estimate #${est.estimate_number ?? ""} awaiting review`,
          body: est.title || "Please review this estimate",
          reference_type: "estimate",
          reference_id: est.id,
        });
      }

      await supabase
        .from("vendor_estimates")
        .update({
          last_reminded_at: now.toISOString(),
          reminder_count: (est.reminder_count ?? 0) + 1,
        })
        .eq("id", est.id);

      results.estimateReminders++;
    }
  } catch (err) {
    results.errors.push(`Estimate reminders: ${err instanceof Error ? err.message : "Unknown error"}`);
  }

  // ─── 3. Review Request Cascade (3-tier: 24h, 7d, 14d post-completion) ───
  try {
    // Find review-eligible WOs: post-service statuses, has homeowner, under 3 contacts, no existing rating
    const { data: candidateWos } = await supabase
      .from("vendor_work_orders")
      .select("id, vendor_org_id, homeowner_id, trade, description, completed_at, review_requested_at, review_reminder_count, review_last_contact_at")
      .in("status", ["completed", "invoiced", "paid"])
      .not("homeowner_id", "is", null)
      .lt("review_reminder_count", 3)
      .order("created_at", { ascending: true })
      .limit(200);

    // Batch-fetch homeowner profiles and vendor orgs to avoid N+1 queries
    const woHomeIds = [...new Set((candidateWos ?? []).map((w) => w.homeowner_id).filter(Boolean))] as string[];
    const woOrgIds = [...new Set((candidateWos ?? []).map((w) => w.vendor_org_id).filter(Boolean))] as string[];

    const homeProfileMap = new Map<string, { email: string | null; full_name: string | null }>();
    if (woHomeIds.length > 0) {
      const { data: homeProfiles } = await supabase.from("profiles").select("id, email, full_name").in("id", woHomeIds);
      for (const p of homeProfiles ?? []) homeProfileMap.set(p.id, { email: p.email, full_name: p.full_name });
    }

    const woOrgMap = new Map<string, string>();
    if (woOrgIds.length > 0) {
      const { data: orgs } = await supabase.from("vendor_organizations").select("id, name").in("id", woOrgIds);
      for (const o of orgs ?? []) woOrgMap.set(o.id, o.name);
    }

    for (const wo of candidateWos ?? []) {
      if (!wo.homeowner_id || !wo.completed_at) { results.skipped.reviews++; continue; }

      // Check if a review already exists — skip entirely
      const { data: existingRating } = await supabase
        .from("vendor_ratings")
        .select("id")
        .eq("work_order_id", wo.id)
        .maybeSingle();

      if (existingRating) { results.skipped.reviews++; continue; }

      const completedAt = new Date(wo.completed_at);
      const hoursSinceCompletion = (now.getTime() - completedAt.getTime()) / (1000 * 60 * 60);
      const count = wo.review_reminder_count ?? 0;

      // Determine which tier this WO qualifies for based on absolute time from completed_at
      let tier: 1 | 2 | 3 | null = null;
      if (count === 0 && hoursSinceCompletion >= 24) tier = 1;
      else if (count === 1 && hoursSinceCompletion >= 7 * 24) tier = 2;
      else if (count === 2 && hoursSinceCompletion >= 14 * 24) tier = 3;

      if (!tier) { results.skipped.reviews++; continue; }

      // 48h debounce: skip if last contact was within 48 hours
      if (wo.review_last_contact_at) {
        const hoursSinceLastContact = (now.getTime() - new Date(wo.review_last_contact_at).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastContact < 48) { results.skipped.reviews++; continue; }
      }

      // Get homeowner email (from batch map)
      const homeProfile = homeProfileMap.get(wo.homeowner_id);
      const vendorName = woOrgMap.get(wo.vendor_org_id) ?? "your vendor";

      const serviceName = wo.trade || wo.description || "service";
      const homeownerName = homeProfile?.full_name || "there";

      // Send email (all tiers)
      if (homeProfile?.email) {
        const email = tier === 1
          ? reviewRequestEmail({ homeownerName, vendorName, serviceSummary: serviceName })
          : reviewReminderEmail({ homeownerName, vendorName, serviceSummary: serviceName });

        try {
          await sendEmail({ to: homeProfile.email, subject: email.subject, html: email.html });
        } catch {
          // Email failure still increments count (intentional — prevents infinite retry loops)
        }
      }

      // In-app notification only on Tier 1
      if (tier === 1) {
        // Dedupe guard: check if review_request notification already exists for this WO
        const { data: existingNotif } = await supabase
          .from("vendor_notifications")
          .select("id")
          .eq("user_id", wo.homeowner_id)
          .eq("type", "review_request")
          .eq("reference_id", wo.id)
          .maybeSingle();

        if (!existingNotif) {
          await supabase.from("vendor_notifications").insert({
            user_id: wo.homeowner_id,
            type: "review_request",
            title: "How was the service?",
            body: `Please rate your ${serviceName} experience`,
            reference_type: "work_order",
            reference_id: wo.id,
          });
        }
      }

      // Update cascade tracking columns
      await supabase
        .from("vendor_work_orders")
        .update({
          ...(count === 0 ? { review_requested_at: now.toISOString() } : {}),
          review_last_contact_at: now.toISOString(),
          review_reminder_count: count + 1,
        })
        .eq("id", wo.id);

      results.reviewRequests++;
    }
  } catch (err) {
    results.errors.push(`Review requests: ${err instanceof Error ? err.message : "Unknown error"}`);
  }

  const totalProcessed = results.invoiceReminders + results.estimateReminders + results.reviewRequests;
  const totalSkipped = results.skipped.invoices + results.skipped.estimates + results.skipped.reviews;
  console.log("[auto-followups]", {
    processed: totalProcessed,
    skipped: totalSkipped,
    errors: results.errors.length,
    breakdown: results,
  });

  return NextResponse.json({
    ok: true,
    processed: totalProcessed,
    skippedTotal: totalSkipped,
    errorCount: results.errors.length,
    invoiceReminders: results.invoiceReminders,
    estimateReminders: results.estimateReminders,
    reviewRequests: results.reviewRequests,
    skipped: results.skipped,
    errors: results.errors,
  });
}
