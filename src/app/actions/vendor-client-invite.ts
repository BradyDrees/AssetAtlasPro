"use server";

import { createClient } from "@/lib/supabase/server";
import { requireVendorRole, logActivity } from "@/lib/vendor/role-helpers";
import { sendSMS, isTwilioConfigured } from "@/lib/vendor/twilio-client";
import { sendEmail } from "@/lib/email/resend-client";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.assetatlaspro.com";

type InviteApp = "home" | "operate";

export interface SendClientInviteInput {
  name: string;
  phone?: string;
  email?: string;
  app: InviteApp;
  sendSms: boolean;
  sendEmail: boolean;
}

/** Build the invite URL based on which app to direct client to */
function buildInviteUrl(app: InviteApp, vendorOrgName: string): string {
  // For "home" → homeowner sign-up landing; for "operate" → PM sign-up
  const path = app === "home" ? "/auth/signup?ref=vendor" : "/auth/signup?ref=vendor&role=pm";
  return `${BASE_URL}${path}&from=${encodeURIComponent(vendorOrgName)}`;
}

/** Build the SMS body for the invite */
function buildSmsBody(
  vendorOrgName: string,
  clientName: string,
  app: InviteApp,
  inviteUrl: string
): string {
  if (app === "home") {
    return `Hi ${clientName}! ${vendorOrgName} is inviting you to connect on Asset Atlas — manage your home services, track work orders, and communicate directly. Sign up here: ${inviteUrl}`;
  }
  return `Hi ${clientName}! ${vendorOrgName} is inviting you to connect on Asset Atlas Pro — manage vendors, work orders, and property operations. Sign up here: ${inviteUrl}`;
}

/** Build the email HTML for the invite */
function buildInviteEmail(
  vendorOrgName: string,
  clientName: string,
  app: InviteApp,
  inviteUrl: string
): { subject: string; html: string } {
  const appLabel = app === "home" ? "Atlas Home" : "Asset Atlas Pro";
  const description = app === "home"
    ? "manage your home services, track work orders, view invoices, and communicate directly with your service provider"
    : "manage vendors, work orders, estimates, invoicing, and property operations all in one place";

  return {
    subject: `${vendorOrgName} invited you to connect on ${appLabel}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <div style="background: #1a1a2e; border-radius: 12px; padding: 32px; color: #fff;">
          <h1 style="font-size: 22px; margin: 0 0 8px;">You're invited!</h1>
          <p style="color: #a0aec0; font-size: 14px; margin: 0 0 24px;">
            <strong>${vendorOrgName}</strong> wants to connect with you on <strong>${appLabel}</strong>.
          </p>
          <p style="color: #cbd5e0; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
            Hi ${clientName},<br/><br/>
            Sign up to ${description}.
          </p>
          <a href="${inviteUrl}" style="display: inline-block; background: #38a169; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Get Started
          </a>
          <p style="color: #718096; font-size: 12px; margin-top: 24px;">
            If you didn't expect this invite, you can safely ignore this email.
          </p>
        </div>
      </div>
    `,
  };
}

/** Send an invite to a client via SMS and/or Email.
 *  Owner/Admin/Office Manager only. */
export async function sendClientInvite(
  input: SendClientInviteInput
): Promise<{ success: boolean; sentVia: string[]; error?: string }> {
  const vendorAuth = await requireVendorRole();

  if (vendorAuth.role === "tech") {
    return { success: false, sentVia: [], error: "Not authorized" };
  }

  if (!input.sendSms && !input.sendEmail) {
    return { success: false, sentVia: [], error: "Must select at least one delivery method" };
  }

  if (input.sendSms && !input.phone) {
    return { success: false, sentVia: [], error: "Phone number required for SMS" };
  }

  if (input.sendEmail && !input.email) {
    return { success: false, sentVia: [], error: "Email required for email delivery" };
  }

  const supabase = await createClient();

  // Get vendor org info
  const { data: vendorOrg } = await supabase
    .from("vendor_organizations")
    .select("name, phone")
    .eq("id", vendorAuth.vendor_org_id)
    .single();

  const vendorOrgName = vendorOrg?.name ?? "Your Service Provider";
  const vendorPhone = vendorOrg?.phone;
  const inviteUrl = buildInviteUrl(input.app, vendorOrgName);
  const sentVia: string[] = [];

  // Send SMS
  if (input.sendSms && input.phone) {
    if (!isTwilioConfigured()) {
      return { success: false, sentVia: [], error: "SMS not configured. Contact support." };
    }

    const fromNumber = vendorPhone ?? process.env.TWILIO_DEFAULT_FROM ?? "";
    if (!fromNumber) {
      return { success: false, sentVia: [], error: "No phone number configured for SMS" };
    }

    const smsBody = buildSmsBody(vendorOrgName, input.name, input.app, inviteUrl);
    const result = await sendSMS(fromNumber, input.phone, smsBody);

    if (result.error) {
      console.error("[client-invite] SMS failed:", result.error);
      // Don't return error yet — try email if also selected
      if (!input.sendEmail) {
        return { success: false, sentVia: [], error: `SMS failed: ${result.error}` };
      }
    } else {
      sentVia.push("sms");
    }
  }

  // Send Email
  if (input.sendEmail && input.email) {
    const emailContent = buildInviteEmail(vendorOrgName, input.name, input.app, inviteUrl);
    const result = await sendEmail({
      to: input.email,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    if (result.error) {
      console.error("[client-invite] Email failed:", result.error);
      if (sentVia.length === 0) {
        return { success: false, sentVia: [], error: `Email failed: ${result.error}` };
      }
    } else {
      sentVia.push("email");
    }
  }

  // Log activity
  await logActivity({
    entityType: "vendor_org",
    entityId: vendorAuth.vendor_org_id,
    action: "client_invite_sent",
    metadata: {
      clientName: input.name,
      app: input.app,
      sentVia,
      phone: input.phone ? `...${input.phone.slice(-4)}` : null,
      email: input.email ?? null,
    },
  });

  return {
    success: sentVia.length > 0,
    sentVia,
    error: sentVia.length === 0 ? "Failed to send invite" : undefined,
  };
}

/** Get the invite URL without sending (for copy-to-clipboard) */
export async function getClientInviteUrl(
  app: InviteApp
): Promise<{ url: string; error?: string }> {
  const vendorAuth = await requireVendorRole();

  if (vendorAuth.role === "tech") {
    return { url: "", error: "Not authorized" };
  }

  const supabase = await createClient();

  const { data: vendorOrg } = await supabase
    .from("vendor_organizations")
    .select("name")
    .eq("id", vendorAuth.vendor_org_id)
    .single();

  const vendorOrgName = vendorOrg?.name ?? "Your Service Provider";
  return { url: buildInviteUrl(app, vendorOrgName) };
}
