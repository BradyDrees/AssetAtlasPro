import "server-only";

// ============================================
// QuickBooks Online — OAuth & API Client
// ============================================

const QBO_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";
const QBO_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const QBO_API_BASE = "https://quickbooks.api.intuit.com/v3/company";
const QBO_SANDBOX_API_BASE = "https://sandbox-quickbooks.api.intuit.com/v3/company";

/**
 * Returns true if QBO OAuth credentials are configured.
 * Gate all QBO features behind this check.
 */
export function isQboConfigured(): boolean {
  return !!(process.env.QBO_CLIENT_ID && process.env.QBO_CLIENT_SECRET);
}

/** Get QBO API base URL (sandbox vs production) */
function getApiBase(): string {
  return process.env.QBO_SANDBOX === "true" ? QBO_SANDBOX_API_BASE : QBO_API_BASE;
}

/**
 * Build the QBO OAuth2 authorization URL.
 */
export function getQboAuthUrl(vendorOrgId: string): string {
  const clientId = process.env.QBO_CLIENT_ID!;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "https://assetatlaspro.com"}/api/integrations/qbo/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    scope: "com.intuit.quickbooks.accounting",
    redirect_uri: redirectUri,
    state: vendorOrgId, // pass org ID through OAuth state
  });

  return `${QBO_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access + refresh tokens.
 */
export async function exchangeQboCode(
  code: string,
  realmId: string
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  error?: string;
}> {
  const clientId = process.env.QBO_CLIENT_ID!;
  const clientSecret = process.env.QBO_CLIENT_SECRET!;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "https://assetatlaspro.com"}/api/integrations/qbo/callback`;

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(QBO_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }).toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[QBO] Token exchange failed:", err);
    return { access_token: "", refresh_token: "", expires_in: 0, error: "Token exchange failed" };
  }

  const data = await res.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in ?? 3600,
  };
}

/**
 * Centralized token refresh helper.
 * Per plan adjustment: all QBO API calls should go through this for token management.
 */
export async function refreshQboToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  error?: string;
}> {
  const clientId = process.env.QBO_CLIENT_ID!;
  const clientSecret = process.env.QBO_CLIENT_SECRET!;
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(QBO_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[QBO] Token refresh failed:", err);
    return { access_token: "", refresh_token: "", expires_in: 0, error: "Token refresh failed" };
  }

  const data = await res.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in ?? 3600,
  };
}

/**
 * Make an authenticated QBO API call.
 * Handles token refresh automatically if token is expired.
 *
 * @param integration - Integration record with tokens + realm_id
 * @param updateTokens - Callback to persist refreshed tokens
 */
export async function qboApiCall(
  integration: {
    access_token: string | null;
    refresh_token: string | null;
    token_expires_at: string | null;
    realm_id: string | null;
  },
  path: string,
  options: {
    method?: string;
    body?: unknown;
  } = {},
  updateTokens?: (tokens: { access_token: string; refresh_token: string; expires_at: string }) => Promise<void>
): Promise<{ data?: unknown; error?: string }> {
  if (!integration.access_token || !integration.realm_id) {
    return { error: "Integration not configured" };
  }

  let accessToken = integration.access_token;

  // Check if token is expired or about to expire (5 min buffer)
  const expiresAt = integration.token_expires_at ? new Date(integration.token_expires_at) : null;
  const now = new Date();
  const fiveMinFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (expiresAt && expiresAt < fiveMinFromNow && integration.refresh_token) {
    // Token expired or about to expire — refresh
    const refreshResult = await refreshQboToken(integration.refresh_token);
    if (refreshResult.error) {
      return { error: `Token refresh failed: ${refreshResult.error}` };
    }

    accessToken = refreshResult.access_token;
    const newExpiresAt = new Date(now.getTime() + refreshResult.expires_in * 1000).toISOString();

    // Persist refreshed tokens
    if (updateTokens) {
      await updateTokens({
        access_token: refreshResult.access_token,
        refresh_token: refreshResult.refresh_token,
        expires_at: newExpiresAt,
      });
    }
  }

  const apiBase = getApiBase();
  const url = `${apiBase}/${integration.realm_id}/${path}`;

  try {
    const res = await fetch(url, {
      method: options.method || "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[QBO] API error ${res.status}:`, errText);
      return { error: `QBO API error: ${res.status}` };
    }

    const data = await res.json();
    return { data };
  } catch (err) {
    console.error("[QBO] API call failed:", err);
    return { error: "QBO API call failed" };
  }
}
