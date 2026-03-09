/**
 * Email HTML templates for vendor platform notifications.
 * Simple, responsive HTML emails with brand styling.
 */

const BRAND_GREEN = "#22c55e";
const BRAND_DARK = "#1a1a1a";
const GRAY_600 = "#4b5563";

function baseTemplate(title: string, body: string, ctaUrl?: string, ctaText?: string): string {
  const ctaHtml = ctaUrl && ctaText ? `
    <div style="text-align:center;margin:28px 0;">
      <a href="${ctaUrl}" style="display:inline-block;padding:12px 28px;background:${BRAND_GREEN};color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">
        ${ctaText}
      </a>
    </div>
  ` : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <div style="background:${BRAND_DARK};padding:20px 24px;">
        <h1 style="margin:0;font-size:18px;color:${BRAND_GREEN};font-weight:700;">Asset Atlas</h1>
      </div>
      <div style="padding:24px;">
        <h2 style="margin:0 0 16px;font-size:18px;color:${BRAND_DARK};">${title}</h2>
        <div style="font-size:14px;line-height:1.6;color:${GRAY_600};">${body}</div>
        ${ctaHtml}
      </div>
      <div style="padding:16px 24px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;text-align:center;">
        Asset Atlas Pro &mdash; Property Operations Platform
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─── Work Order Assigned ───
export function woAssignedEmail(params: {
  vendorName: string;
  propertyName: string;
  description: string;
  priority: string;
  jobUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `New Work Order: ${params.propertyName}`,
    html: baseTemplate(
      "New Work Order Assigned",
      `<p>Hi ${params.vendorName},</p>
       <p>A new work order has been assigned to your organization:</p>
       <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:12px 0;">
         <p style="margin:0 0 4px;font-weight:600;color:${BRAND_DARK}">${params.propertyName}</p>
         <p style="margin:0 0 4px;">${params.description}</p>
         <p style="margin:0;"><span style="font-weight:500;">Priority:</span> ${params.priority}</p>
       </div>`,
      params.jobUrl,
      "View Work Order"
    ),
  };
}

// ─── Estimate Submitted (notify PM) ───
export function estimateSubmittedEmail(params: {
  pmName: string;
  vendorName: string;
  estimateNumber: string;
  propertyName: string;
  total: string;
  reviewUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `Estimate #${params.estimateNumber} Ready for Review`,
    html: baseTemplate(
      "Estimate Ready for Review",
      `<p>Hi ${params.pmName},</p>
       <p>${params.vendorName} has submitted an estimate for your review:</p>
       <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:12px 0;">
         <p style="margin:0 0 4px;font-weight:600;color:${BRAND_DARK}">Estimate #${params.estimateNumber}</p>
         <p style="margin:0 0 4px;">${params.propertyName}</p>
         <p style="margin:0;font-size:20px;font-weight:700;color:${BRAND_GREEN}">${params.total}</p>
       </div>`,
      params.reviewUrl,
      "Review Estimate"
    ),
  };
}

// ─── Estimate Approved/Declined (notify vendor) ───
export function estimateDecisionEmail(params: {
  vendorName: string;
  estimateNumber: string;
  decision: "approved" | "declined";
  reason?: string;
  estimateUrl: string;
}): { subject: string; html: string } {
  const color = params.decision === "approved" ? BRAND_GREEN : "#ef4444";
  const label = params.decision === "approved" ? "Approved" : "Declined";
  return {
    subject: `Estimate #${params.estimateNumber} ${label}`,
    html: baseTemplate(
      `Estimate ${label}`,
      `<p>Hi ${params.vendorName},</p>
       <p>Your estimate <strong>#${params.estimateNumber}</strong> has been <span style="color:${color};font-weight:600;">${label.toLowerCase()}</span>.</p>
       ${params.reason ? `<div style="background:#fef2f2;border-left:3px solid #ef4444;padding:12px;margin:12px 0;border-radius:4px;"><p style="margin:0;font-size:13px;">${params.reason}</p></div>` : ""}`,
      params.estimateUrl,
      "View Estimate"
    ),
  };
}

// ─── Invoice Submitted (notify PM) ───
export function invoiceSubmittedEmail(params: {
  pmName: string;
  vendorName: string;
  invoiceNumber: string;
  propertyName: string;
  total: string;
  reviewUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `Invoice #${params.invoiceNumber} Submitted`,
    html: baseTemplate(
      "Invoice Submitted for Review",
      `<p>Hi ${params.pmName},</p>
       <p>${params.vendorName} has submitted an invoice:</p>
       <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:12px 0;">
         <p style="margin:0 0 4px;font-weight:600;color:${BRAND_DARK}">Invoice #${params.invoiceNumber}</p>
         <p style="margin:0 0 4px;">${params.propertyName}</p>
         <p style="margin:0;font-size:20px;font-weight:700;color:${BRAND_GREEN}">${params.total}</p>
       </div>`,
      params.reviewUrl,
      "Review Invoice"
    ),
  };
}

// ─── Invoice Paid (notify vendor) ───
export function invoicePaidEmail(params: {
  vendorName: string;
  invoiceNumber: string;
  total: string;
  invoiceUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `Invoice #${params.invoiceNumber} Paid`,
    html: baseTemplate(
      "Payment Received",
      `<p>Hi ${params.vendorName},</p>
       <p>Great news! Invoice <strong>#${params.invoiceNumber}</strong> has been marked as paid.</p>
       <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:12px 0;text-align:center;">
         <p style="margin:0;font-size:24px;font-weight:700;color:${BRAND_GREEN}">${params.total}</p>
         <p style="margin:4px 0 0;font-size:13px;color:#16a34a;">Payment received</p>
       </div>`,
      params.invoiceUrl,
      "View Invoice"
    ),
  };
}

// ─── Invoice Disputed (notify vendor) ───
export function invoiceDisputedEmail(params: {
  vendorName: string;
  invoiceNumber: string;
  reason: string;
  invoiceUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `Invoice #${params.invoiceNumber} Disputed`,
    html: baseTemplate(
      "Invoice Disputed",
      `<p>Hi ${params.vendorName},</p>
       <p>Invoice <strong>#${params.invoiceNumber}</strong> has been disputed by the PM.</p>
       <div style="background:#fef2f2;border-left:3px solid #ef4444;padding:12px;margin:12px 0;border-radius:4px;">
         <p style="margin:0;font-size:13px;font-weight:500;">Reason:</p>
         <p style="margin:4px 0 0;font-size:13px;">${params.reason}</p>
       </div>
       <p>Please review and resubmit the invoice.</p>`,
      params.invoiceUrl,
      "View Invoice"
    ),
  };
}

// ─── Homeowner: WO Submitted ───
export function woSubmittedEmail(params: {
  homeownerName: string;
  trade: string;
  woUrl: string;
}): { subject: string; html: string } {
  return {
    subject: "Your work order has been submitted",
    html: baseTemplate(
      "Work Order Submitted",
      `<p>Hi ${params.homeownerName},</p>
       <p>Your <strong>${params.trade}</strong> work order has been submitted. We're matching you with a vendor now.</p>`,
      params.woUrl,
      "View Work Order"
    ),
  };
}

// ─── Homeowner: Vendor Accepted ───
export function woAcceptedEmail(params: {
  homeownerName: string;
  vendorName: string;
  trade: string;
  woUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `${params.vendorName} accepted your work order`,
    html: baseTemplate(
      "Vendor Accepted",
      `<p>Hi ${params.homeownerName},</p>
       <p><strong>${params.vendorName}</strong> has accepted your <strong>${params.trade}</strong> work order. They'll be in touch soon to schedule.</p>`,
      params.woUrl,
      "View Work Order"
    ),
  };
}

// ─── Homeowner: Work Completed ───
export function woCompletedEmail(params: {
  homeownerName: string;
  vendorName: string;
  trade: string;
  woUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `${params.vendorName} completed your work order`,
    html: baseTemplate(
      "Work Completed",
      `<p>Hi ${params.homeownerName},</p>
       <p><strong>${params.vendorName}</strong> has completed the <strong>${params.trade}</strong> work. Please review and rate their service.</p>`,
      params.woUrl,
      "Review & Rate"
    ),
  };
}

// ─── Homeowner: Vendor Declined (cascade) ───
export function woDeclinedCascadeEmail(params: {
  homeownerName: string;
  trade: string;
  woUrl: string;
}): { subject: string; html: string } {
  return {
    subject: "We're finding you another vendor",
    html: baseTemplate(
      "Finding Another Vendor",
      `<p>Hi ${params.homeownerName},</p>
       <p>The vendor for your <strong>${params.trade}</strong> work order was unable to take the job. We're automatically reaching out to the next best match.</p>`,
      params.woUrl,
      "View Work Order"
    ),
  };
}

// ─── Vendor Invite (PM inviting vendor) ───
export function vendorInviteEmail(params: {
  pmName: string;
  inviteLink: string;
  expiresAtText: string;
}): { subject: string; html: string; text: string } {
  return {
    subject: `${params.pmName} invited you to connect on Asset Atlas`,
    html: baseTemplate(
      "You're Invited to Connect",
      `<p>Hi,</p>
       <p><strong>${params.pmName}</strong> has invited you to connect as a vendor on Asset Atlas.</p>
       <p>Once connected, you'll be able to receive work orders, submit estimates, and manage jobs together.</p>
       <p style="font-size:12px;color:#9ca3af;">This link expires ${params.expiresAtText}.</p>`,
      params.inviteLink,
      "Accept Invite"
    ),
    text: `${params.pmName} invited you to connect on Asset Atlas.\nAccept: ${params.inviteLink}\nExpires: ${params.expiresAtText}`,
  };
}

// ─── Relationship Status Change ───
export function relationshipStatusEmail(params: {
  recipientName: string;
  otherPartyName: string;
  status: "suspended" | "terminated" | "active";
}): { subject: string; html: string; text: string } {
  const statusLabel = params.status === "active" ? "reactivated" : params.status;
  const color = params.status === "active" ? BRAND_GREEN : params.status === "suspended" ? "#f59e0b" : "#ef4444";
  return {
    subject: `Vendor relationship ${statusLabel}: ${params.otherPartyName}`,
    html: baseTemplate(
      "Relationship Update",
      `<p>Hi ${params.recipientName},</p>
       <p>Your vendor relationship with <strong>${params.otherPartyName}</strong> has been <span style="color:${color};font-weight:600;">${statusLabel}</span>.</p>
       ${params.status === "suspended" ? '<p>New work order assignments are paused until the relationship is reactivated.</p>' : ""}
       ${params.status === "terminated" ? '<p>This relationship has been ended. A new invite will be needed to reconnect.</p>' : ""}
       ${params.status === "active" ? '<p>Work order assignments can now resume as normal.</p>' : ""}`
    ),
    text: `Relationship update: Your relationship with ${params.otherPartyName} has been ${statusLabel}.`,
  };
}

// ─── PM Invite (Vendor inviting PM) ───
export function pmInviteEmail(params: {
  vendorName: string;
  inviteLink: string;
  expiresAtText: string;
}): { subject: string; html: string; text: string } {
  return {
    subject: `${params.vendorName} wants to connect on Asset Atlas`,
    html: baseTemplate(
      "Vendor Connection Request",
      `<p>Hi,</p>
       <p><strong>${params.vendorName}</strong> has invited you to connect as a client on Asset Atlas.</p>
       <p>Once connected, you'll be able to assign work orders, review estimates, and manage vendor relationships.</p>
       <p style="font-size:12px;color:#9ca3af;">This link expires ${params.expiresAtText}.</p>`,
      params.inviteLink,
      "Accept Invite"
    ),
    text: `${params.vendorName} wants to connect on Asset Atlas.\nAccept: ${params.inviteLink}\nExpires: ${params.expiresAtText}`,
  };
}

// ─── Invoice Overdue Reminder ───
export function invoiceOverdueEmail(params: {
  invoiceNumber: string;
  amount: string;
  daysOverdue: number;
  vendorName: string;
}): { subject: string; html: string } {
  const tone =
    params.daysOverdue >= 30
      ? { label: "Final Notice", color: "#dc2626", msg: "This invoice is significantly overdue. Please arrange payment immediately to avoid further action." }
      : params.daysOverdue >= 14
        ? { label: "Escalation Notice", color: "#ea580c", msg: "This invoice is now two weeks overdue. Please prioritize payment at your earliest convenience." }
        : params.daysOverdue >= 7
          ? { label: "Payment Reminder", color: "#d97706", msg: "This invoice is one week past due. Please arrange payment soon." }
          : { label: "Friendly Reminder", color: "#2563eb", msg: "This invoice is a few days past due. A quick payment would be appreciated." };

  return {
    subject: `${tone.label}: Invoice #${params.invoiceNumber} — ${params.daysOverdue} days overdue`,
    html: baseTemplate(
      tone.label,
      `<p>Hi,</p>
       <p>Invoice <strong>#${params.invoiceNumber}</strong> from <strong>${params.vendorName}</strong> is <span style="color:${tone.color};font-weight:600;">${params.daysOverdue} days overdue</span>.</p>
       <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:12px 0;text-align:center;">
         <p style="margin:0;font-size:24px;font-weight:700;color:${tone.color}">${params.amount}</p>
       </div>
       <p>${tone.msg}</p>`
    ),
  };
}

// ─── Estimate Follow-Up ───
export function estimateFollowUpEmail(params: {
  estimateNumber: string;
  vendorName: string;
}): { subject: string; html: string } {
  return {
    subject: `Estimate #${params.estimateNumber} awaiting your review`,
    html: baseTemplate(
      "Estimate Awaiting Review",
      `<p>Hi,</p>
       <p><strong>${params.vendorName}</strong> submitted estimate <strong>#${params.estimateNumber}</strong> and it's still awaiting your review.</p>
       <p>Please take a moment to review and approve, request changes, or decline.</p>`
    ),
  };
}

// ─── Review Request (post-completion, Tier 1) ───
export function reviewRequestEmail(params: {
  homeownerName: string;
  vendorName: string;
  serviceSummary: string;
}): { subject: string; html: string } {
  return {
    subject: `How was your ${params.serviceSummary} service?`,
    html: baseTemplate(
      "Rate Your Service",
      `<p>Hi ${params.homeownerName},</p>
       <p>Your <strong>${params.serviceSummary}</strong> work with <strong>${params.vendorName}</strong> has been completed.</p>
       <p>We'd love to hear about your experience. Your feedback helps us improve service quality and helps other homeowners find great vendors.</p>`,
      "https://assetatlaspro.com/login",
      "Leave a Review"
    ),
  };
}

// ─── Review Reminder (Tiers 2 & 3) ───
export function reviewReminderEmail(params: {
  homeownerName: string;
  vendorName: string;
  serviceSummary: string;
}): { subject: string; html: string } {
  return {
    subject: `Quick reminder: How was your ${params.serviceSummary} service?`,
    html: baseTemplate(
      "We'd Love Your Feedback",
      `<p>Hi ${params.homeownerName},</p>
       <p>Just a friendly reminder — we'd appreciate your feedback on the <strong>${params.serviceSummary}</strong> work done by <strong>${params.vendorName}</strong>.</p>
       <p>It only takes a moment and helps the community.</p>`,
      "https://assetatlaspro.com/login",
      "Leave a Review"
    ),
  };
}

// ─── New Chat Message (notify recipient) ───
export function newChatMessageEmail(params: {
  recipientName: string;
  senderName: string;
  senderRole: string;
  preview: string;
  chatUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `New message from ${params.senderName}`,
    html: baseTemplate(
      "New Message",
      `<p>Hi ${params.recipientName},</p>
       <p>You have a new message from <strong>${params.senderName}</strong> (${params.senderRole}):</p>
       <div style="background:#f9fafb;border-left:3px solid ${BRAND_GREEN};padding:12px;margin:12px 0;border-radius:4px;">
         <p style="margin:0;font-size:13px;font-style:italic;">"${params.preview.slice(0, 200)}${params.preview.length > 200 ? "..." : ""}"</p>
       </div>`,
      params.chatUrl,
      "View Conversation"
    ),
  };
}
