import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helpers";
import { getCompanyById, getUsageByCompany } from "@/lib/queries";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const company = await getCompanyById(id);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    if (company.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const usage = await getUsageByCompany(id, user.id);

    const totalCreditsUsed = usage.reduce(
      (sum, tx) => sum + Math.abs(tx.amount),
      0
    );

    return NextResponse.json({
      company_id: id,
      total_credits_used: totalCreditsUsed,
      transactions: usage,
    });
  } catch (error) {
    console.error("[API] GET /api/companies/[id]/usage error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
