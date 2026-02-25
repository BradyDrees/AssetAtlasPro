import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Asset Atlas Pro — Real Estate Operations Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #06090f 0%, #0d1320 50%, #06090f 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Title */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 900,
            color: "#f1f5f9",
            letterSpacing: -2,
            lineHeight: 1.1,
            textAlign: "center",
            marginBottom: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <span>Acquire. Operate.</span>
          <span
            style={{
              background: "linear-gradient(90deg, #06b6d4, #22d3ee)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Build Your Empire.
          </span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 20,
            color: "#94a3b8",
            fontWeight: 300,
            marginBottom: 40,
          }}
        >
          Real Estate Operations Platform
        </div>

        {/* Tier pills */}
        <div
          style={{
            display: "flex",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(59,130,246,0.15)",
              border: "1px solid rgba(59,130,246,0.3)",
              borderRadius: 10,
              padding: "10px 20px",
            }}
          >
            <span style={{ fontSize: 22 }}>🔍</span>
            <span
              style={{ color: "#3b82f6", fontSize: 16, fontWeight: 700 }}
            >
              Atlas Acquire
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(34,197,94,0.15)",
              border: "1px solid rgba(34,197,94,0.3)",
              borderRadius: 10,
              padding: "10px 20px",
            }}
          >
            <span style={{ fontSize: 22 }}>🏢</span>
            <span
              style={{ color: "#22c55e", fontSize: 16, fontWeight: 700 }}
            >
              Atlas Operate
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(245,158,11,0.15)",
              border: "1px solid rgba(245,158,11,0.3)",
              borderRadius: 10,
              padding: "10px 20px",
            }}
          >
            <span style={{ fontSize: 22 }}>🔧</span>
            <span
              style={{ color: "#f59e0b", fontSize: 16, fontWeight: 700 }}
            >
              Atlas Pro
            </span>
          </div>
        </div>

        {/* Bottom branding */}
        <div
          style={{
            position: "absolute",
            bottom: 30,
            fontSize: 14,
            color: "#64748b",
            fontWeight: 500,
          }}
        >
          assetatlaspro.com
        </div>
      </div>
    ),
    { ...size }
  );
}
