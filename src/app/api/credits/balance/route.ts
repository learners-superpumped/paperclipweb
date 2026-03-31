import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helpers";
import { getUserCredits } from "@/lib/queries";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const credits = await getUserCredits(user.id);
    return NextResponse.json(credits);
  } catch (error) {
    console.error("[API] GET /api/credits/balance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
