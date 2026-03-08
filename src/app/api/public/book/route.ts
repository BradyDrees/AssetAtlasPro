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

export async function POST(request: NextRequest) {
  try {
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
