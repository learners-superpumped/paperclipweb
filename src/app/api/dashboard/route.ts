import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helpers";
import { getDashboardStats } from "@/lib/queries";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = await getDashboardStats(user.id);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("[API] GET /api/dashboard error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
