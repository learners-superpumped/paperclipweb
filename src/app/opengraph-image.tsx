import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "paperclip — Hire an AI team, run a business on its own";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #4F46E5 0%, #312E81 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "80px",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 28, opacity: 0.85, marginBottom: 24 }}>
          paperclip
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
          }}
        >
          Hire an AI team,
          <br />
          run a business on its own
        </div>
        <div style={{ fontSize: 28, marginTop: 32, opacity: 0.9 }}>
          Clone a YouTube case in 5 min → $29 for the real instance
        </div>
      </div>
    ),
    size,
  );
}
