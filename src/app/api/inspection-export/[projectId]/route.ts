/**
 * Inspection PDF/ZIP/Excel Export API Route
 * GET /api/inspection-export/[projectId]?format=full|summary|photos|zip|excel
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { fetchInspectionData } from "@/lib/pdf/fetch-inspection-data";
import { generateInspectionFullReport } from "@/lib/pdf/generate-inspection-full-report";
import { generateInspectionSummary } from "@/lib/pdf/generate-inspection-summary";
import { generateInspectionPhotoBook } from "@/lib/pdf/generate-inspection-photo-book";
import { generateInspectionPhotoZip } from "@/lib/pdf/generate-inspection-photo-zip";
import { generateInspectionExcel } from "@/lib/pdf/generate-inspection-excel";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for large exports

const VALID_FORMATS = new Set(["full", "summary", "photos", "zip", "excel"]);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const startTime = Date.now();

  try {
    const { projectId } = await params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") ?? "";

    // Locale: ?locale param takes priority over cookie
    const cookieStore = await cookies();
    const locale =
      searchParams.get("locale") ||
      cookieStore.get("locale")?.value ||
      "en";

    if (!VALID_FORMATS.has(format)) {
      return NextResponse.json(
        { error: `Invalid format. Use: ${[...VALID_FORMATS].join(", ")}` },
        { status: 400 }
      );
    }

    // Fetch all inspection data (includes auth check)
    const data = await fetchInspectionData(projectId);
    if (!data) {
      return NextResponse.json(
        { error: "Not found or unauthorized" },
        { status: 401 }
      );
    }

    const projectCode = data.project.name
      .replace(/[^a-zA-Z0-9]/g, "-")
      .replace(/-+/g, "-");

    let fileBuffer: Buffer | Uint8Array;
    let contentType: string;
    let filename: string;

    switch (format) {
      case "full": {
        fileBuffer = await generateInspectionFullReport(data);
        contentType = "application/pdf";
        filename = `${projectCode}-inspection-full-report.pdf`;
        break;
      }
      case "summary": {
        fileBuffer = await generateInspectionSummary(data);
        contentType = "application/pdf";
        filename = `${projectCode}-inspection-summary.pdf`;
        break;
      }
      case "photos": {
        fileBuffer = await generateInspectionPhotoBook(data);
        contentType = "application/pdf";
        filename = `${projectCode}-inspection-photo-book.pdf`;
        break;
      }
      case "zip": {
        fileBuffer = await generateInspectionPhotoZip(data);
        contentType = "application/zip";
        filename = `${projectCode}-inspection-photos.zip`;
        break;
      }
      case "excel": {
        fileBuffer = await generateInspectionExcel(data);
        contentType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        filename = `${projectCode}-inspection-data.xlsx`;
        break;
      }
      default:
        return NextResponse.json({ error: "Invalid format" }, { status: 400 });
    }

    // Convert to Uint8Array for NextResponse compatibility
    const body = new Uint8Array(
      fileBuffer instanceof Buffer
        ? fileBuffer.buffer.slice(
            fileBuffer.byteOffset,
            fileBuffer.byteOffset + fileBuffer.byteLength
          )
        : fileBuffer
    );

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(body.byteLength),
      },
    });
  } catch (err: any) {
    const elapsed = Date.now() - startTime;
    console.error(`Inspection export failed after ${elapsed}ms:`, err);

    // Handle the "too many photos" error from ZIP
    if (err?.message?.includes("Too many photos")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Export generation failed" },
      { status: 500 }
    );
  }
}
