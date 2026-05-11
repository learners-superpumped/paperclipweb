import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#4F46E5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: 300,
          fontWeight: 700,
        }}
      >
        📎
      </div>
    ),
    { width: 512, height: 512 },
  );
}
