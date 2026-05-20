import { ImageResponse } from "next/og";
import { paperclipMark } from "@/components/paperclip-mark";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(paperclipMark(192), { width: 192, height: 192 });
}
