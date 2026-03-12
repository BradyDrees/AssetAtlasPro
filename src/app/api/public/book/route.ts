import { NextRequest, NextResponse } from "next/server";
import { submitBookingViaApiKey } from "@/app/book/[slug]/book-actions";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key",
};

export async function OPTIONS() {
  return NextResponse.json(null, { status: 204, headers: CORS_HEADERS });
}

const MAX_BODY_BYTES = 10_240; // 10 KB

const FIELD_LIMITS: Record<string, number> = {
  name: 200,
  phone: 20,
  email: 320,
  address: 500,
  trade: 100,
  description: 5_000,
  preferred_date: 30,
};

export async function POST(request: NextRequest) {
  try {
    // --- Content-Type guard ---
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { success: false, error: "Content-Type must be application/json" },
        { status: 415, headers: CORS_HEADERS }
      );
    }

    // --- Body size guard ---
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
      return NextResponse.json(
        { success: false, error: "Request body too large (max 10 KB)" },
        { status: 413, headers: CORS_HEADERS }
      );
    }

    const apiKey = request.headers.get("x-api-key");

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Missing x-api-key header" },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const { name, phone, email, address, trade, description, preferred_date } = body;

    if (!name || !phone || !description) {
      return NextResponse.json(
        { success: false, error: "name, phone, and description are required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // --- Field length validation ---
    const fields: Record<string, unknown> = { name, phone, email, address, trade, description, preferred_date };
    for (const [key, maxLen] of Object.entries(FIELD_LIMITS)) {
      const val = fields[key];
      if (typeof val === "string" && val.length > maxLen) {
        return NextResponse.json(
          { success: false, error: `${key} exceeds max length of ${maxLen} characters` },
          { status: 400, headers: CORS_HEADERS }
        );
      }
    }

    const result = await submitBookingViaApiKey(apiKey, {
      name,
      phone,
      email,
      address,
      trade,
      description,
      preferred_date,
    });

    if (!result.success) {
      const status = result.error === "Invalid API key" ? 401
        : result.error === "Rate limit exceeded" ? 429
        : 400;
      return NextResponse.json(result, { status, headers: CORS_HEADERS });
    }

    return NextResponse.json(result, { status: 201, headers: CORS_HEADERS });
  } catch (err) {
    console.error("[POST /api/public/book] Error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
