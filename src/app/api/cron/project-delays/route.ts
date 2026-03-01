import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Cron job: Detect stalled project trades (assigned > 48 hours).
 * Run daily via Vercel cron.
 *
 * vercel.json:
 * { "crons": [{ "path": "/api/cron/project-delays", "schedule": "0 8 * * *" }] }
 */

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const cutoff = new Date(Date.now() - 48 * 3600000).toISOString();

  // Find active project WOs that have been assigned for > 48 hours
  const { data: stalled, error } = await supabase
    .from("vendor_work_orders")
    .select("id, project_id, trade, homeowner_id, updated_at")
    .eq("status", "assigned")
    .not("project_id", "is", null)
    .lt("updated_at", cutoff);

  if (error) {
    console.error("Project delay query error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!stalled || stalled.length === 0) {
    return NextResponse.json({ notified: 0 });
  }

  // Group by homeowner to avoid duplicate notifications
  const byHomeowner = new Map<string, typeof stalled>();
  for (const wo of stalled) {
    if (!wo.homeowner_id) continue;
    const existing = byHomeowner.get(wo.homeowner_id) ?? [];
    existing.push(wo);
    byHomeowner.set(wo.homeowner_id, existing);
  }

  let notified = 0;

  for (const [homeownerId, wos] of byHomeowner) {
    const tradeList = wos
      .map((w: { trade: string | null }) => w.trade ?? "service")
      .join(", ");

    await supabase.from("vendor_notifications").insert({
      user_id: homeownerId,
      type: "project_delay",
      title: "Project trade delayed",
      body: `${wos.length} trade(s) haven't progressed in 48+ hours: ${tradeList}`,
      reference_type: "project",
      reference_id: wos[0].project_id,
      is_read: false,
    });

    notified++;
  }

  return NextResponse.json({ notified });
}
