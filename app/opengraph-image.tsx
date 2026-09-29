import { ImageResponse } from "next/og";

export const alt = "ARC — Build quietly. Become different.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "#F7F5F0",
          color: "#111111",
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: 10 }}>ARC</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, lineHeight: 1.08, letterSpacing: -2 }}>Build quietly.</div>
          <div style={{ fontSize: 76, lineHeight: 1.08, letterSpacing: -2 }}>Become different.</div>
          <div style={{ fontSize: 30, color: "#77756F", marginTop: 32 }}>90 days of showing up.</div>
        </div>
      </div>
    ),
    size,
  );
}
