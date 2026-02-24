import { Resend } from "resend";

/**
 * Resend email client.
 * Requires RESEND_API_KEY in environment.
 * Falls back silently if not configured (dev environment).
 */
function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

/** Sender address — uses verified domain or Resend test address */
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL ?? "Asset Atlas <onboarding@resend.dev>";

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

/**
 * Send an email via Resend.
 * Returns silently if Resend is not configured (no API key).
 */
export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
  const resend = getResendClient();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping email send");
    return { success: false, error: "Email not configured" };
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      replyTo: payload.replyTo,
    });

    if (error) {
      console.error("[email] Send failed:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[email] Unexpected error:", err);
    return { success: false, error: "Unexpected error sending email" };
  }
}
