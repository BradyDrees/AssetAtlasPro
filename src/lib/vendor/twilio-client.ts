/**
 * Twilio REST API client — zero dependencies.
 * Uses fetch against Twilio's REST API with Basic Auth.
 * All functions are server-only (never import from client components).
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
}

export interface TwilioSendResult {
  sid: string;
  status: string;
  error?: string;
}

export interface TwilioPurchaseResult {
  sid: string;
  phoneNumber: string;
  friendlyName: string;
  error?: string;
}

export interface TwilioAvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  locality: string;
  region: string;
}

// ─── Config ──────────────────────────────────────────────────────────────────

function getConfig(): TwilioConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return null;
  return { accountSid, authToken };
}

export function isTwilioConfigured(): boolean {
  return getConfig() !== null;
}

function authHeader(config: TwilioConfig): string {
  const encoded = Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64");
  return `Basic ${encoded}`;
}

function baseUrl(config: TwilioConfig): string {
  return `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}`;
}

// ─── Send SMS ────────────────────────────────────────────────────────────────

export async function sendSMS(
  from: string,
  to: string,
  body: string
): Promise<TwilioSendResult> {
  const config = getConfig();
  if (!config) return { sid: "", status: "failed", error: "Twilio not configured" };

  const params = new URLSearchParams({ From: from, To: to, Body: body });

  const res = await fetch(`${baseUrl(config)}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: authHeader(config),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = await res.json();

  if (!res.ok) {
    return { sid: "", status: "failed", error: data.message || "Twilio API error" };
  }

  return { sid: data.sid, status: data.status };
}

// ─── Search Available Numbers ────────────────────────────────────────────────

export async function searchAvailableNumbers(
  country: string = "US",
  areaCode?: string
): Promise<{ numbers: TwilioAvailableNumber[]; error?: string }> {
  const config = getConfig();
  if (!config) return { numbers: [], error: "Twilio not configured" };

  const params = new URLSearchParams({
    SmsEnabled: "true",
    VoiceEnabled: "true",
  });
  if (areaCode) params.set("AreaCode", areaCode);

  const res = await fetch(
    `${baseUrl(config)}/AvailablePhoneNumbers/${country}/Local.json?${params.toString()}`,
    { headers: { Authorization: authHeader(config) } }
  );

  const data = await res.json();

  if (!res.ok) {
    return { numbers: [], error: data.message || "Failed to search numbers" };
  }

  return {
    numbers: (data.available_phone_numbers || []).slice(0, 10).map(
      (n: Record<string, string>) => ({
        phoneNumber: n.phone_number,
        friendlyName: n.friendly_name,
        locality: n.locality || "",
        region: n.region || "",
      })
    ),
  };
}

// ─── Purchase Number ─────────────────────────────────────────────────────────

export async function purchaseNumber(
  phoneNumber: string,
  smsWebhookUrl?: string,
  voiceWebhookUrl?: string
): Promise<TwilioPurchaseResult> {
  const config = getConfig();
  if (!config) return { sid: "", phoneNumber: "", friendlyName: "", error: "Twilio not configured" };

  const params = new URLSearchParams({ PhoneNumber: phoneNumber });
  if (smsWebhookUrl) {
    params.set("SmsUrl", smsWebhookUrl);
    params.set("SmsMethod", "POST");
  }
  if (voiceWebhookUrl) {
    params.set("VoiceUrl", voiceWebhookUrl);
    params.set("VoiceMethod", "POST");
  }

  const res = await fetch(`${baseUrl(config)}/IncomingPhoneNumbers.json`, {
    method: "POST",
    headers: {
      Authorization: authHeader(config),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = await res.json();

  if (!res.ok) {
    return { sid: "", phoneNumber: "", friendlyName: "", error: data.message || "Failed to purchase number" };
  }

  return {
    sid: data.sid,
    phoneNumber: data.phone_number,
    friendlyName: data.friendly_name,
  };
}

// ─── Release Number ──────────────────────────────────────────────────────────

export async function releaseNumber(twilioSid: string): Promise<{ error?: string }> {
  const config = getConfig();
  if (!config) return { error: "Twilio not configured" };

  const res = await fetch(`${baseUrl(config)}/IncomingPhoneNumbers/${twilioSid}.json`, {
    method: "DELETE",
    headers: { Authorization: authHeader(config) },
  });

  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}));
    return { error: (data as Record<string, string>).message || "Failed to release number" };
  }

  return {};
}

// ─── Validate Twilio Webhook Signature ───────────────────────────────────────

export function validateWebhookSignature(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  // For production: implement HMAC-SHA1 validation
  // For now, check that signature header exists (basic check)
  // Full implementation requires crypto.createHmac with auth token
  const config = getConfig();
  if (!config) return false;
  return !!signature && !!url && !!params;
}
