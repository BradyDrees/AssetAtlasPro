import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/resend-client";
import {
  invoiceOverdueEmail,
  estimateFollowUpEmail,
  reviewRequestEmail,
} from "@/lib/email/templates";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

  if (!serviceRoleKey) {
    return NextResponse.json({ error: "Service role key not configured" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const now = new Date();
  const results = { invoiceReminders: 0, estimateReminders: 0, reviewRequests: 0, errors: [] as string[] };

  // ─── 1. Invoice Overdue Reminders ───
  try {
    // Find non-draft, non-paid invoices that are past due
    const { data: overdueInvoices } = await supabase
      .from("vendor_invoices")
      .select("id, invoice_number, total, due_date, pm_user_id, vendor_org_id, last_reminded_at, reminder_count, status")
      .in("status", ["submitted", "pm_approved", "processing"])
      .not("due_date", "is", null)
      .lt("due_date", now.toISOString().split("T")[0]);

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

      if (!shouldRemind) continue;

      // Get PM email for notification
      if (inv.pm_user_id) {
        const { data: pmProfile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", inv.pm_user_id)
          .single();

        if (pmProfile?.email) {
          // Get vendor org name
          const { data: vendorOrg } = await supabase
            .from("vendor_organizations")
            .select("name")
            .eq("id", inv.vendor_org_id)
            .single();

          const email = invoiceOverdueEmail({
            invoiceNumber: inv.invoice_number ?? inv.id.slice(0, 8),
            amount: `$${Number(inv.total).toLocaleString()}`,
            daysOverdue,
            vendorName: vendorOrg?.name ?? "Vendor",
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
      .or("reminder_count.is.null,reminder_count.lt.2");

    for (const est of pendingEstimates ?? []) {
      if ((est.reminder_count ?? 0) >= 2) continue;

      // Skip if recently reminded (within 3 days)
      if (est.last_reminded_at) {
        const lastReminded = new Date(est.last_reminded_at);
        const daysSinceReminder = (now.getTime() - lastReminded.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceReminder < 3) continue;
      }

      if (est.pm_user_id) {
        const { data: pmProfile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", est.pm_user_id)
          .single();

        if (pmProfile?.email) {
          const { data: vendorOrg } = await supabase
            .from("vendor_organizations")
            .select("name")
            .eq("id", est.vendor_org_id)
            .single();

          const email = estimateFollowUpEmail({
            estimateNumber: est.estimate_number ?? est.id.slice(0, 8),
            vendorName: vendorOrg?.name ?? "Vendor",
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

  // ─── 3. Review Requests (completed jobs 24h+ ago) ───
  try {
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const { data: completedWos } = await supabase
      .from("vendor_work_orders")
      .select("id, vendor_org_id, homeowner_id, trade, description, completed_at")
      .eq("status", "completed")
      .not("homeowner_id", "is", null)
      .lt("completed_at", oneDayAgo);

    for (const wo of completedWos ?? []) {
      if (!wo.homeowner_id) continue;

      // Check if a review already exists
      const { data: existingRating } = await supabase
        .from("vendor_ratings")
        .select("id")
        .eq("work_order_id", wo.id)
        .maybeSingle();

      if (existingRating) continue;

      // Check if already notified about review for this WO
      const { data: existingNotif } = await supabase
        .from("vendor_notifications")
        .select("id")
        .eq("user_id", wo.homeowner_id)
        .eq("type", "review_request")
        .eq("reference_id", wo.id)
        .maybeSingle();

      if (existingNotif) continue;

      // Get homeowner email
      const { data: homeProfile } = await supabase
        .from("profiles")
        .select("email, display_name")
        .eq("id", wo.homeowner_id)
        .single();

      if (homeProfile?.email) {
        const { data: vendorOrg } = await supabase
          .from("vendor_organizations")
          .select("name")
          .eq("id", wo.vendor_org_id)
          .single();

        const email = reviewRequestEmail({
          homeownerName: homeProfile.display_name || "there",
          vendorName: vendorOrg?.name ?? "your vendor",
          serviceSummary: wo.trade || wo.description || "service",
        });

        await sendEmail({
          to: homeProfile.email,
          subject: email.subject,
          html: email.html,
        });
      }

      // In-app notification
      await supabase.from("vendor_notifications").insert({
        user_id: wo.homeowner_id,
        type: "review_request",
        title: "How was the service?",
        body: `Please rate your ${wo.trade || "service"} experience`,
        reference_type: "work_order",
        reference_id: wo.id,
      });

      results.reviewRequests++;
    }
  } catch (err) {
    results.errors.push(`Review requests: ${err instanceof Error ? err.message : "Unknown error"}`);
  }

  console.log("[auto-followups]", results);

  return NextResponse.json({
    ok: true,
    ...results,
  });
}
