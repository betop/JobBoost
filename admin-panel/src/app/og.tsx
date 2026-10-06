import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

export function renderOg(headline: string, sub: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 90,
          color: "white",
          background: "linear-gradient(135deg, #0c4a6e 0%, #0284c7 55%, #38bdf8 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 36, fontWeight: 700, opacity: 0.9, letterSpacing: 4 }}>HHQ</div>
        <div style={{ display: "flex", fontSize: 84, fontWeight: 800, lineHeight: 1.05, marginTop: 24 }}>{headline}</div>
        <div style={{ display: "flex", fontSize: 38, marginTop: 28, opacity: 0.92 }}>{sub}</div>
      </div>
    ),
    { ...OG_SIZE }
  );
}
