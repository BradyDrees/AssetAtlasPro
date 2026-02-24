import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Twilio Voice Webhook — receives inbound calls.
 * Returns TwiML to play a message or forward to the org's office number.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const from = formData.get("From") as string;
    const to = formData.get("To") as string;
    const callSid = formData.get("CallSid") as string;
    const callDuration = formData.get("CallDuration") as string;

    if (!from || !to) {
      return new NextResponse(twiml("<Say>This number is not available.</Say>"), {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    const supabase = createServiceClient();

    // Find which org owns this number
    const { data: phone } = await supabase
      .from("vendor_phone_numbers")
      .select("id, vendor_org_id")
      .eq("twilio_number", to)
      .eq("status", "active")
      .single();

    if (!phone) {
      return new NextResponse(
        twiml("<Say>This number is no longer in service.</Say>"),
        { status: 200, headers: { "Content-Type": "text/xml" } }
      );
    }

    // Get org's main phone for forwarding
    const { data: org } = await supabase
      .from("vendor_organizations")
      .select("phone")
      .eq("id", phone.vendor_org_id)
      .single();

    // Try to match to a work order
    const { data: workOrders } = await supabase
      .from("vendor_work_orders")
      .select("id")
      .eq("vendor_org_id", phone.vendor_org_id)
      .eq("tenant_phone", from)
      .not("status", "in", '("completed","invoiced","paid","declined")')
      .order("created_at", { ascending: false })
      .limit(1);

    const workOrderId = workOrders && workOrders.length > 0 ? workOrders[0].id : null;

    // Log the call
    await supabase.from("vendor_messages").insert({
      vendor_org_id: phone.vendor_org_id,
      work_order_id: workOrderId,
      phone_number_id: phone.id,
      sender_user_id: null,
      direction: "inbound",
      message_type: "call",
      from_number: from,
      to_number: to,
      body: null,
      status: "received",
      twilio_sid: callSid || null,
      duration_seconds: callDuration ? parseInt(callDuration, 10) : null,
    });

    // Forward to org phone or play voicemail
    if (org?.phone) {
      return new NextResponse(
        twiml(`<Dial callerId="${to}">${org.phone}</Dial>`),
        { status: 200, headers: { "Content-Type": "text/xml" } }
      );
    }

    return new NextResponse(
      twiml("<Say>Please leave a message after the beep.</Say><Record maxLength=\"120\" transcribe=\"true\" />"),
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  } catch {
    return new NextResponse(
      twiml("<Say>An error occurred. Please try again later.</Say>"),
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  }
}

function twiml(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`;
}
