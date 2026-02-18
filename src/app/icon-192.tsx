import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1a3a2a",
          borderRadius: "38px",
        }}
      >
        <span
          style={{
            fontSize: "128px",
            fontWeight: "bold",
            color: "#82bf9c",
            fontFamily: "Arial, sans-serif",
          }}
        >
          A
        </span>
      </div>
    ),
    { ...size }
  );
}
