"use client";

import { useState } from "react";
import type { PropertyPassportData } from "@/lib/home/passport-types";

// ─── Grade color helpers ────────────────────────────────
function gradeColor(grade: string): string {
  switch (grade) {
    case "A":
      return "#22c55e";
    case "B":
      return "#3b82f6";
    case "C":
      return "#f59e0b";
    case "D":
      return "#f97316";
    default:
      return "#ef4444";
  }
}

function gradeTextColor(grade: string): string {
  switch (grade) {
    case "A":
      return "text-green-600";
    case "B":
      return "text-blue-600";
    case "C":
      return "text-amber-600";
    case "D":
      return "text-orange-600";
    default:
      return "text-red-600";
  }
}

function gradeBg(grade: string): string {
  switch (grade) {
    case "A":
      return "bg-green-50";
    case "B":
      return "bg-blue-50";
    case "C":
      return "bg-amber-50";
    case "D":
      return "bg-orange-50";
    default:
      return "bg-red-50";
  }
}

// ─── System name labels ──────────────────────────────────
const SYSTEM_LABELS: Record<string, string> = {
  hvac: "HVAC",
  roof: "Roof",
  water_heater: "Water Heater",
  electrical_panel: "Electrical Panel",
};

const TRADE_LABELS: Record<string, string> = {
  hvac: "HVAC",
  plumbing: "Plumbing",
  electrical: "Electrical",
  roofing: "Roofing",
  general: "General",
  painting: "Painting",
  appliance: "Appliance",
  landscaping: "Landscaping",
  pest_control: "Pest Control",
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  sfr: "Single Family",
  condo: "Condo",
  townhouse: "Townhouse",
  duplex: "Duplex",
};

// ─── Score Ring SVG ──────────────────────────────────────
function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = gradeColor(grade);

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg viewBox="0 0 128 128" className="w-full h-full">
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="8"
        />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 64 64)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-gray-900">{score}</span>
        <span
          className={`text-sm font-semibold ${gradeTextColor(grade)}`}
        >
          Grade {grade}
        </span>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────
export function PassportPublicView({
  passport,
}: {
  passport: PropertyPassportData;
}) {
  const [exporting, setExporting] = useState(false);

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();

      // Header
      doc.setFontSize(20);
      doc.text("Property Passport", 20, 25);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text("Property condition overview", 20, 33);

      // Property address
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text(passport.address, 20, 48);
      const locationParts = [passport.city, passport.state, passport.zip].filter(Boolean);
      if (locationParts.length > 0) {
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(locationParts.join(", "), 20, 55);
      }

      // Overall score
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(`Overall Score: ${passport.overallScore}/100 (Grade ${passport.grade})`, 20, 68);

      // Property details
      let y = 80;
      doc.setFontSize(12);
      doc.text("Property Details", 20, y);
      y += 8;
      doc.setFontSize(10);
      doc.setTextColor(60);
      if (passport.property_type) {
        doc.text(`Type: ${PROPERTY_TYPE_LABELS[passport.property_type] ?? passport.property_type}`, 20, y);
        y += 6;
      }
      if (passport.year_built) { doc.text(`Year Built: ${passport.year_built}`, 20, y); y += 6; }
      if (passport.sqft) { doc.text(`Size: ${passport.sqft.toLocaleString()} sq ft`, 20, y); y += 6; }
      if (passport.beds) { doc.text(`Beds: ${passport.beds}`, 20, y); y += 6; }
      if (passport.baths) { doc.text(`Baths: ${passport.baths}`, 20, y); y += 6; }

      // System breakdown
      y += 8;
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text("System Details", 20, y);
      y += 8;
      doc.setFontSize(10);

      for (const sys of passport.systemBreakdown) {
        doc.setTextColor(0);
        const label = SYSTEM_LABELS[sys.system] ?? sys.system;
        const ageStr = sys.known ? `${sys.age} yrs old` : "Unknown age";
        doc.text(`${label}: ${sys.score}/100 — ${ageStr}`, 20, y);
        y += 6;
      }

      // Maintenance history
      if (passport.maintenanceHistory.length > 0) {
        y += 8;
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text("Maintenance History", 20, y);
        y += 8;
        doc.setFontSize(10);
        doc.setTextColor(60);
        for (const entry of passport.maintenanceHistory.slice(0, 10)) {
          const tradeLabel = TRADE_LABELS[entry.trade] ?? entry.trade;
          doc.text(`${tradeLabel} — ${entry.completedMonth}`, 20, y);
          y += 6;
          if (y > 270) { doc.addPage(); y = 20; }
        }
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text("Generated by Atlas Home", 20, 285);

      doc.save("property-passport.pdf");
    } catch {
      // PDF export failed silently
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-rose-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819"
                />
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              Property Passport
            </span>
          </div>
          <button
            onClick={handleExportPdf}
            disabled={exporting}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            {exporting ? "Exporting..." : "Export PDF"}
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Property Address Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {passport.address}
          </h1>
          {(passport.city || passport.state || passport.zip) && (
            <p className="text-sm text-gray-500 mt-1">
              {[passport.city, passport.state, passport.zip]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}

          {/* Property details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-100">
            {passport.property_type && (
              <div>
                <p className="text-xs text-gray-500 font-medium">Type</p>
                <p className="text-sm text-gray-900 font-medium capitalize">
                  {PROPERTY_TYPE_LABELS[passport.property_type] ??
                    passport.property_type}
                </p>
              </div>
            )}
            {passport.year_built && (
              <div>
                <p className="text-xs text-gray-500 font-medium">Year Built</p>
                <p className="text-sm text-gray-900 font-medium">
                  {passport.year_built}
                </p>
              </div>
            )}
            {passport.sqft && (
              <div>
                <p className="text-xs text-gray-500 font-medium">Sq Ft</p>
                <p className="text-sm text-gray-900 font-medium">
                  {passport.sqft.toLocaleString()}
                </p>
              </div>
            )}
            {passport.beds && (
              <div>
                <p className="text-xs text-gray-500 font-medium">Beds</p>
                <p className="text-sm text-gray-900 font-medium">
                  {passport.beds}
                </p>
              </div>
            )}
            {passport.baths && (
              <div>
                <p className="text-xs text-gray-500 font-medium">Baths</p>
                <p className="text-sm text-gray-900 font-medium">
                  {passport.baths}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Overall Score */}
        <div
          className={`rounded-xl border border-gray-200 p-6 ${gradeBg(passport.grade)}`}
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            Overall Score
          </h2>
          <ScoreRing score={passport.overallScore} grade={passport.grade} />
          <p className="text-xs text-gray-500 text-center mt-3">
            Confidence:{" "}
            <span className="capitalize font-medium">
              {passport.confidence}
            </span>
          </p>
        </div>

        {/* System Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            System Details
          </h2>
          <div className="space-y-4">
            {passport.systemBreakdown.map((sys) => {
              const label = SYSTEM_LABELS[sys.system] ?? sys.system;
              const color = gradeColor(
                sys.score >= 90
                  ? "A"
                  : sys.score >= 80
                    ? "B"
                    : sys.score >= 70
                      ? "C"
                      : sys.score >= 60
                        ? "D"
                        : "F"
              );
              const photo = passport.systemPhotos.find(
                (p) => p.system_type === sys.system
              );

              return (
                <div key={sys.system} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {label}
                      </p>
                      <p className="text-xs text-gray-500">
                        {sys.known
                          ? `${sys.age} years old (${sys.lifespan} yr lifespan)`
                          : "Age unknown"}
                      </p>
                    </div>
                    <span
                      className="text-sm font-bold"
                      style={{ color }}
                    >
                      {sys.score}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${sys.score}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  {/* System photo */}
                  {photo && (
                    <div className="mt-2">
                      <img
                        src={photo.photo_url}
                        alt={label}
                        className="w-full max-w-xs rounded-lg border border-gray-200"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Maintenance History */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Maintenance History
          </h2>
          {passport.maintenanceHistory.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              No maintenance history available
            </p>
          ) : (
            <div className="space-y-3">
              {passport.maintenanceHistory.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm text-gray-900 capitalize">
                      {TRADE_LABELS[entry.trade] ?? entry.trade}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {entry.completedMonth}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-400">
            Powered by Atlas Home
          </p>
        </div>
      </div>
    </div>
  );
}
