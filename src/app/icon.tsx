import { ImageResponse } from "next/og";
import { paperclipMark } from "@/components/paperclip-mark";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(paperclipMark(192), { ...size });
}
