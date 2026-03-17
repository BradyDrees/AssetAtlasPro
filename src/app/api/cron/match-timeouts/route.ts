import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Cron job: Process timed-out vendor match attempts.
// Run every 5 minutes via Vercel cron.
// vercel.json: { "crons": [{ "path": "/api/cron/match-timeouts", "schedule": "every 5 min" }] }

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  // Find timed-out match attempts
  const { data: timedOut, error } = await supabase
    .from("vendor_match_attempts")
    .select("id, work_order_id, vendor_org_id")
    .eq("status", "notified")
    .lt("response_deadline", now);

  if (error) {
    console.error("Match timeout query error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!timedOut || timedOut.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  let processed = 0;

  for (const attempt of timedOut) {
    // Mark as timed out
    await supabase
      .from("vendor_match_attempts")
      .update({
        status: "timeout",
        responded_at: now,
      })
      .eq("id", attempt.id);

    // Find next pending match for this WO
    const { data: nextMatch } = await supabase
      .from("vendor_match_attempts")
      .select("id, vendor_org_id, rank")
      .eq("work_order_id", attempt.work_order_id)
      .eq("status", "pending")
      .order("rank", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (nextMatch) {
      // Get WO urgency for deadline calculation
      const { data: wo } = await supabase
        .from("vendor_work_orders")
        .select("urgency")
        .eq("id", attempt.work_order_id)
        .is("archived_at", null)
        .single();

      const urgency = wo?.urgency ?? "routine";
      let deadlineHours = 4;
      if (urgency === "emergency") deadlineHours = 0.25;
      else if (urgency === "urgent") deadlineHours = 0.5;
      else if (urgency === "flexible") deadlineHours = 24;

      const deadline = new Date(
        Date.now() + deadlineHours * 3600000
      ).toISOString();

      // Advance to next vendor
      await supabase
        .from("vendor_match_attempts")
        .update({
          status: "notified",
          notified_at: now,
          response_deadline: deadline,
        })
        .eq("id", nextMatch.id);

      // Update WO with new vendor
      await supabase
        .from("vendor_work_orders")
        .update({ vendor_org_id: nextMatch.vendor_org_id })
        .eq("id", attempt.work_order_id);

      // Notify new vendor
      const { data: members } = await supabase
        .from("vendor_users")
        .select("user_id")
        .eq("vendor_org_id", nextMatch.vendor_org_id)
        .eq("is_active", true);

      if (members?.length) {
        const woData = await supabase
          .from("vendor_work_orders")
          .select("trade, description, urgency")
          .eq("id", attempt.work_order_id)
          .is("archived_at", null)
          .single();

        await supabase.from("vendor_notifications").insert(
          members.map((m: { user_id: string }) => ({
            user_id: m.user_id,
            type: "new_work_order",
            title: "New Work Order",
            body: `${woData.data?.trade ?? "Service"} • ${woData.data?.urgency ?? "routine"}`,
            reference_type: "work_order",
            reference_id: attempt.work_order_id,
            is_read: false,
          }))
        );
      }
    } else {
      // No more matches — set WO to no_match
      await supabase
        .from("vendor_work_orders")
        .update({ status: "no_match" })
        .eq("id", attempt.work_order_id);

      // Notify homeowner
      const { data: wo } = await supabase
        .from("vendor_work_orders")
        .select("homeowner_id, trade")
        .eq("id", attempt.work_order_id)
        .is("archived_at", null)
        .single();

      if (wo?.homeowner_id) {
        await supabase.from("vendor_notifications").insert({
          user_id: wo.homeowner_id,
          type: "wo_no_match",
          title: "No vendor match found",
          body: `We couldn't find an available vendor for ${wo.trade ?? "your request"}. You can browse and pick a vendor manually.`,
          reference_type: "work_order",
          reference_id: attempt.work_order_id,
          is_read: false,
        });
      }
    }

    processed++;
  }

  return NextResponse.json({ processed });
}
