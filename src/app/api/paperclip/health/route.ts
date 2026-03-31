import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helpers";
import { checkPaperclipHealth, isPaperclipConfigured } from "@/lib/paperclip";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isPaperclipConfigured()) {
      return NextResponse.json({
        configured: false,
        connected: false,
        message: "Paperclip is not configured. Set PAPERCLIP_API_URL and PAPERCLIP_API_KEY.",
      });
    }

    const health = await checkPaperclipHealth();

    return NextResponse.json({
      configured: true,
      connected: health.ok,
      url: health.url,
      error: health.error,
    });
  } catch (error) {
    console.error("[API] GET /api/paperclip/health error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
