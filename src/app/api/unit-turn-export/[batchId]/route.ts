/**
 * Unit Turn PDF/ZIP/Excel Export API Route
 * GET /api/unit-turn-export/[batchId]?format=pdf|excel|zip&unitId={optional}
 *
 * - pdf: requires unitId — single unit report
 * - excel: batch-level spreadsheet (all units)
 * - zip: if unitId → single unit photos; otherwise all batch photos
 */

import { NextResponse } from "next/server";
import { fetchUnitTurnData } from "@/lib/pdf/fetch-unit-turn-data";
import { generateUnitTurnReport } from "@/lib/pdf/generate-unit-turn-report";
import { generateUnitTurnExcel } from "@/lib/pdf/generate-unit-turn-excel";
import { generateUnitTurnPhotoZip } from "@/lib/pdf/generate-unit-turn-photo-zip";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for large exports

const VALID_FORMATS = new Set(["pdf", "excel", "zip"]);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const startTime = Date.now();

  try {
    const { batchId } = await params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") ?? "";
    const unitId = searchParams.get("unitId") ?? undefined;

    if (!VALID_FORMATS.has(format)) {
      return NextResponse.json(
        { error: `Invalid format. Use: ${[...VALID_FORMATS].join(", ")}` },
        { status: 400 }
      );
    }

    if (format === "pdf" && !unitId) {
      return NextResponse.json(
        { error: "PDF export requires a unitId parameter" },
        { status: 400 }
      );
    }

    // Fetch data — single unit for PDF/unit-ZIP, all units for Excel/batch-ZIP
    const needsAllUnits = format === "excel" || (format === "zip" && !unitId);
    const data = await fetchUnitTurnData(batchId, needsAllUnits ? undefined : unitId);

    if (!data) {
      return NextResponse.json(
        { error: "Not found or unauthorized" },
        { status: 401 }
      );
    }

    const batchCode = data.batch.name
      .replace(/[^a-zA-Z0-9]/g, "-")
      .replace(/-+/g, "-");

    let fileBuffer: Buffer | Uint8Array;
    let contentType: string;
    let filename: string;

    switch (format) {
      case "pdf": {
        const unit = data.units[0];
        fileBuffer = await generateUnitTurnReport(data);
        contentType = "application/pdf";
        const propCode = unit.property.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-");
        filename = `${batchCode}-${propCode}-Unit-${unit.unit_label}-report.pdf`;
        break;
      }
      case "excel": {
        fileBuffer = await generateUnitTurnExcel(data);
        contentType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        filename = `${batchCode}-unit-turn-data.xlsx`;
        break;
      }
      case "zip": {
        fileBuffer = await generateUnitTurnPhotoZip(data);
        contentType = "application/zip";
        if (unitId && data.units[0]) {
          const unit = data.units[0];
          const propCode = unit.property.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-");
          filename = `${batchCode}-${propCode}-Unit-${unit.unit_label}-photos.zip`;
        } else {
          filename = `${batchCode}-unit-turn-photos.zip`;
        }
        break;
      }
      default:
        return NextResponse.json({ error: "Invalid format" }, { status: 400 });
    }

    const elapsed = Date.now() - startTime;
    const totalPhotos = Object.values(data.photosByUnit).reduce(
      (sum, arr) => sum + arr.length,
      0
    );
    console.log(
      `Unit turn export ${format} generated in ${elapsed}ms (${data.units.length} units, ${totalPhotos} photos)`
    );

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
    console.error(`Unit turn export failed after ${elapsed}ms:`, err);

    if (err?.message?.includes("Too many photos")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Export generation failed" },
      { status: 500 }
    );
  }
}
