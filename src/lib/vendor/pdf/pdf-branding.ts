import { createClient } from "@/lib/supabase/server";
import sharp from "sharp";

// ============================================
// Types
// ============================================

export interface OrgBranding {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  logoBase64: string | null;
  logoWidth: number;
  logoHeight: number;
  brandColor: [number, number, number]; // RGB
}

// ============================================
// In-memory logo cache (per org + URL hash)
// ============================================

const logoCache = new Map<string, { base64: string; width: number; height: number } | null>();

// ============================================
// Fetch Branding
// ============================================

/**
 * Fetch org branding data including resized logo for PDF.
 * Logo is cached in-memory by org ID + logo URL hash.
 * Returns fallback values if logo fetch fails.
 */
export async function fetchBranding(orgId: string): Promise<OrgBranding> {
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("vendor_organizations")
    .select("name, phone, email, address, city, state, zip, logo_url, settings")
    .eq("id", orgId)
    .single();

  const branding: OrgBranding = {
    name: org?.name ?? "Company",
    phone: org?.phone ?? null,
    email: org?.email ?? null,
    address: org?.address ?? null,
    city: org?.city ?? null,
    state: org?.state ?? null,
    zip: org?.zip ?? null,
    logoBase64: null,
    logoWidth: 0,
    logoHeight: 0,
    brandColor: [34, 139, 34], // Default green
  };

  // Parse brand color from settings JSONB
  const settings = org?.settings as Record<string, unknown> | null;
  if (settings?.brand_color && typeof settings.brand_color === "string") {
    const hex = settings.brand_color.replace("#", "");
    if (hex.length === 6) {
      branding.brandColor = [
        parseInt(hex.substring(0, 2), 16),
        parseInt(hex.substring(2, 4), 16),
        parseInt(hex.substring(4, 6), 16),
      ];
    }
  }

  // Fetch and resize logo
  const logoUrl = org?.logo_url as string | null;
  if (logoUrl) {
    const cacheKey = `${orgId}:${logoUrl}`;

    if (logoCache.has(cacheKey)) {
      const cached = logoCache.get(cacheKey);
      if (cached) {
        branding.logoBase64 = cached.base64;
        branding.logoWidth = cached.width;
        branding.logoHeight = cached.height;
      }
      return branding;
    }

    try {
      // Fetch logo image
      const response = await fetch(logoUrl, { signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer());

        // Resize to max 150px wide, maintain aspect ratio
        const resized = await sharp(buffer)
          .resize({ width: 150, fit: "inside" })
          .png()
          .toBuffer();

        const metadata = await sharp(resized).metadata();
        const base64 = `data:image/png;base64,${resized.toString("base64")}`;

        const logoData = {
          base64,
          width: metadata.width ?? 150,
          height: metadata.height ?? 40,
        };

        logoCache.set(cacheKey, logoData);
        branding.logoBase64 = logoData.base64;
        branding.logoWidth = logoData.width;
        branding.logoHeight = logoData.height;
      } else {
        logoCache.set(cacheKey, null);
      }
    } catch {
      // Graceful fallback — logo fetch failed
      logoCache.set(cacheKey, null);
    }
  }

  return branding;
}

/**
 * Render org branding header onto a jsPDF document.
 * Returns the Y position after the header.
 */
export function renderBrandingHeader(
  doc: InstanceType<typeof import("jspdf").jsPDF>,
  branding: OrgBranding,
  startY: number = 15
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = startY;
  let textStartX = 14;

  // Logo (top-left)
  if (branding.logoBase64) {
    try {
      // Scale logo to fit PDF (max 35mm wide, proportional height)
      const maxWidth = 35;
      const scale = maxWidth / branding.logoWidth;
      const pdfWidth = maxWidth;
      const pdfHeight = branding.logoHeight * scale;

      doc.addImage(branding.logoBase64, "PNG", 14, y - 5, pdfWidth, pdfHeight);
      textStartX = 14 + pdfWidth + 5; // Shift text right of logo
    } catch {
      // Logo render failed — fall back to text
    }
  }

  // Company name
  doc.setFontSize(16);
  doc.setTextColor(...branding.brandColor);
  doc.text(branding.name, textStartX, y + 5);

  // Contact info below name
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  let infoY = y + 11;
  if (branding.phone) { doc.text(branding.phone, textStartX, infoY); infoY += 4; }
  if (branding.email) { doc.text(branding.email, textStartX, infoY); infoY += 4; }
  if (branding.address) {
    const fullAddr = [branding.address, branding.city, branding.state, branding.zip]
      .filter(Boolean)
      .join(", ");
    doc.text(fullAddr, textStartX, infoY);
    infoY += 4;
  }

  return Math.max(infoY + 2, y + 30); // Minimum header height
}
