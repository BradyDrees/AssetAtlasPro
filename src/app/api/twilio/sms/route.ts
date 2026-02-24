import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Twilio SMS Webhook — receives inbound SMS messages.
 * Twilio POSTs form-encoded data when someone texts our number.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const from = formData.get("From") as string;
    const to = formData.get("To") as string;
    const body = formData.get("Body") as string;
    const messageSid = formData.get("MessageSid") as string;

    if (!from || !to) {
      return new NextResponse(twiml(""), { status: 200, headers: { "Content-Type": "text/xml" } });
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
      // Number not found in our system — ignore
      return new NextResponse(twiml(""), { status: 200, headers: { "Content-Type": "text/xml" } });
    }

    // Try to match sender to a work order by tenant_phone
    const { data: workOrders } = await supabase
      .from("vendor_work_orders")
      .select("id")
      .eq("vendor_org_id", phone.vendor_org_id)
      .eq("tenant_phone", from)
      .not("status", "in", '("completed","invoiced","paid","declined")')
      .order("created_at", { ascending: false })
      .limit(1);

    const workOrderId = workOrders && workOrders.length > 0 ? workOrders[0].id : null;

    // Log inbound message
    await supabase.from("vendor_messages").insert({
      vendor_org_id: phone.vendor_org_id,
      work_order_id: workOrderId,
      phone_number_id: phone.id,
      sender_user_id: null,
      direction: "inbound",
      message_type: "sms",
      from_number: from,
      to_number: to,
      body: body || null,
      status: "received",
      twilio_sid: messageSid || null,
    });

    // Return empty TwiML (no auto-reply)
    return new NextResponse(twiml(""), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch {
    return new NextResponse(twiml(""), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
}

function twiml(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`;
}
