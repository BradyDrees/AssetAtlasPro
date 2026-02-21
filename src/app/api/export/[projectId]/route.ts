/**
 * PDF/ZIP Export API Route
 * GET /api/export/[projectId]?format=full|summary|photos|zip
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { fetchProjectData } from "@/lib/pdf/fetch-project-data";
import { generateFullReport } from "@/lib/pdf/generate-full-report";
import { generateSummary } from "@/lib/pdf/generate-summary";
import { generatePhotoBook } from "@/lib/pdf/generate-photo-book";
import { generatePhotoZip } from "@/lib/pdf/generate-photo-zip";
import { generateExcel } from "@/lib/pdf/generate-csv";

export const runtime = "nodejs";

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

    // Fetch all project data (includes auth check)
    const data = await fetchProjectData(projectId);
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
        fileBuffer = await generateFullReport(data);
        contentType = "application/pdf";
        filename = `${projectCode}-full-report.pdf`;
        break;
      }
      case "summary": {
        fileBuffer = await generateSummary(data);
        contentType = "application/pdf";
        filename = `${projectCode}-summary.pdf`;
        break;
      }
      case "photos": {
        fileBuffer = await generatePhotoBook(data);
        contentType = "application/pdf";
        filename = `${projectCode}-photo-book.pdf`;
        break;
      }
      case "zip": {
        fileBuffer = await generatePhotoZip(data);
        contentType = "application/zip";
        filename = `${projectCode}-photos.zip`;
        break;
      }
      case "excel": {
        fileBuffer = await generateExcel(data);
        contentType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        filename = `${projectCode}-inspection-data.xlsx`;
        break;
      }
      default:
        return NextResponse.json({ error: "Invalid format" }, { status: 400 });
    }

    const elapsed = Date.now() - startTime;
    console.log(
      `Export ${format} generated in ${elapsed}ms for ${data.captures.length} image captures (${data.allCaptures.length} total captures)`
    );

    // Convert to Uint8Array for NextResponse compatibility
    const body = new Uint8Array(
      fileBuffer instanceof Buffer ? fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength) : fileBuffer
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
    console.error(`Export failed after ${elapsed}ms:`, err);

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
