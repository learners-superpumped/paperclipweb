import { ImageResponse } from "next/og";
import { paperclipMark } from "@/components/paperclip-mark";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(paperclipMark(512, { maskable: true }), {
    width: 512,
    height: 512,
  });
}
