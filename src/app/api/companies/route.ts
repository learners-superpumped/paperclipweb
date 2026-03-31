import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth-helpers";
import { getCompaniesByUser, createCompany, getUserCredits, updateCompanyStatus } from "@/lib/queries";
import { PLANS } from "@/lib/constants";

const CreateCompanySchema = z.object({
  name: z.string().min(1).max(100),
});

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companies = await getCompaniesByUser(user.id);
    return NextResponse.json({ companies });
  } catch (error) {
    console.error("[API] GET /api/companies error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = CreateCompanySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Check instance limit
    const existingCompanies = await getCompaniesByUser(user.id);
    const credits = await getUserCredits(user.id);
    const plan = credits.plan as keyof typeof PLANS;
    const maxCompanies = PLANS[plan]?.companies ?? 1;

    if (existingCompanies.length >= maxCompanies) {
      return NextResponse.json(
        { error: `Your ${plan} plan allows up to ${maxCompanies} instance(s). Please upgrade to create more.` },
        { status: 403 }
      );
    }

    const company = await createCompany({
      userId: user.id,
      name: parsed.data.name,
    });

    // Simulate provisioning -> running after creation (MVP: instant)
    if (company) {
      setTimeout(async () => {
        try {
          await updateCompanyStatus(company.id, "running");
        } catch {
          // Ignore - will be provisioning status
        }
      }, 3000);
    }

    return NextResponse.json({ company }, { status: 201 });
  } catch (error) {
    console.error("[API] POST /api/companies error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
