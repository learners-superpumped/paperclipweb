import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "paperclip — Launch Your AI Company. No infra needed.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#F5F4FF",
          display: "flex",
          alignItems: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Indigo glow blobs */}
        <div
          style={{
            position: "absolute",
            right: -80,
            top: -120,
            width: 560,
            height: 560,
            background:
              "radial-gradient(circle, rgba(79,70,229,0.2) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: -60,
            bottom: -100,
            width: 380,
            height: 380,
            background:
              "radial-gradient(circle, rgba(79,70,229,0.08) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        {/* Paperclip visual on right */}
        <div
          style={{
            position: "absolute",
            right: 110,
            top: 80,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 120,
              height: 280,
              border: "10px solid rgba(79,70,229,0.35)",
              borderRadius: 60,
              display: "flex",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 30,
                left: -20,
                right: -20,
                bottom: -10,
                border: "6px solid rgba(79,70,229,0.6)",
                borderRadius: 50,
                display: "flex",
              }}
            />
          </div>
        </div>
        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            paddingLeft: 100,
            maxWidth: 630,
            position: "relative",
          }}
        >
          {/* Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "rgba(79,70,229,0.10)",
              border: "1px solid rgba(79,70,229,0.22)",
              padding: "6px 16px",
              borderRadius: 100,
              marginBottom: 36,
              alignSelf: "flex-start",
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#4F46E5",
                letterSpacing: "0.10em",
              }}
            >
              AI COMPANY LAUNCHER
            </span>
          </div>
          {/* Logo */}
          <div
            style={{
              fontSize: 84,
              fontWeight: 900,
              color: "#0F0F23",
              letterSpacing: -3.5,
              lineHeight: 0.92,
              marginBottom: 26,
              display: "flex",
            }}
          >
            <span>paper</span>
            <span style={{ color: "#4F46E5" }}>clip</span>
          </div>
          {/* Tagline */}
          <div
            style={{
              fontSize: 28,
              fontWeight: 400,
              color: "#4B5563",
              lineHeight: 1.4,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <span>Launch Your AI Company.</span>
            <span>No infra needed.</span>
          </div>
          {/* One-liner */}
          <div
            style={{
              fontSize: 15,
              color: "rgba(75,85,99,0.55)",
              marginTop: 18,
              maxWidth: 490,
              lineHeight: 1.55,
              display: "flex",
            }}
          >
            Users, payments, and email — all wired up with just Stripe. Launch
            in minutes.
          </div>
          {/* Stripe badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#635BFF",
              padding: "6px 14px",
              borderRadius: 6,
              marginTop: 22,
              alignSelf: "flex-start",
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "white",
                letterSpacing: "0.02em",
              }}
            >
              Just Stripe
            </span>
          </div>
        </div>
        {/* Domain */}
        <div
          style={{
            position: "absolute",
            bottom: 48,
            left: 100,
            fontSize: 14,
            color: "rgba(75,85,99,0.35)",
            display: "flex",
          }}
        >
          usepaperclip.app
        </div>
      </div>
    ),
    size,
  );
}
