import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { CallStatus } from "@/lib/messaging/types";

/**
 * Twilio webhook handler for call status updates + voicemail transcription.
 *
 * Twilio will POST to this endpoint with call events:
 * - CallStatus: initiated, ringing, in-progress, completed, busy, no-answer, failed, canceled
 * - RecordingUrl + TranscriptionText for voicemail
 *
 * This uses the service role key to bypass RLS for updates.
 */

// Map Twilio status strings to our CallStatus type
const statusMap: Record<string, CallStatus> = {
  initiated: "initiated",
  ringing: "ringing",
  "in-progress": "in_progress",
  completed: "completed",
  busy: "busy",
  "no-answer": "no_answer",
  failed: "failed",
  canceled: "canceled",
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const callSid = formData.get("CallSid") as string | null;
    const callStatus = formData.get("CallStatus") as string | null;
    const duration = formData.get("CallDuration") as string | null;
    const recordingUrl = formData.get("RecordingUrl") as string | null;
    const transcriptionText = formData.get("TranscriptionText") as string | null;

    if (!callSid) {
      return NextResponse.json({ error: "Missing CallSid" }, { status: 400 });
    }

    // Create admin Supabase client (bypasses RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[twilio-webhook] Missing Supabase env vars");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build update payload
    const update: Record<string, unknown> = {};

    if (callStatus) {
      const mappedStatus = statusMap[callStatus.toLowerCase()];
      if (mappedStatus) {
        update.status = mappedStatus;
      }
    }

    if (duration) {
      update.duration_seconds = parseInt(duration, 10) || null;
    }

    if (
      callStatus?.toLowerCase() === "completed" ||
      callStatus?.toLowerCase() === "busy" ||
      callStatus?.toLowerCase() === "no-answer" ||
      callStatus?.toLowerCase() === "failed" ||
      callStatus?.toLowerCase() === "canceled"
    ) {
      update.ended_at = new Date().toISOString();
    }

    if (recordingUrl) {
      update.voicemail_url = recordingUrl;
    }

    if (transcriptionText) {
      update.voicemail_transcription = transcriptionText;
      update.status = "voicemail";
    }

    // Update call log by twilio_call_sid
    if (Object.keys(update).length > 0) {
      const { error } = await supabase
        .from("call_logs")
        .update(update)
        .eq("twilio_call_sid", callSid);

      if (error) {
        console.error("[twilio-webhook] Update error:", error);
      }
    }

    // Twilio expects a TwiML response for call status callbacks
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      }
    );
  } catch (err) {
    console.error("[twilio-webhook] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
