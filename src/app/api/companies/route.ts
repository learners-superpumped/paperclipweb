import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth-helpers";
import { getCompaniesByUser, createCompany, getUserCredits } from "@/lib/queries";
import { PLANS } from "@/lib/constants";
import {
  isPaperclipConfigured,
  createPaperclipCompany,
  getPaperclipCompanyUrl,
} from "@/lib/paperclip";

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
        {
          error: `Your ${plan} plan allows up to ${maxCompanies} instance(s). Please upgrade to create more.`,
        },
        { status: 403 }
      );
    }

    const companyName = parsed.data.name;

    // If Paperclip is configured, create a real company
    if (isPaperclipConfigured()) {
      const pcCompany = await createPaperclipCompany(
        companyName,
        `Managed instance for ${user.email ?? "user"}`
      );

      if (!pcCompany) {
        return NextResponse.json(
          { error: "Failed to provision Paperclip instance. Please try again." },
          { status: 502 }
        );
      }

      const instanceUrl = getPaperclipCompanyUrl(pcCompany.id);

      const company = await createCompany({
        userId: user.id,
        name: companyName,
        paperclipCompanyId: pcCompany.id,
        instanceUrl,
        status: "running",
      });

      return NextResponse.json({ company }, { status: 201 });
    }

    // Paperclip not configured — demo mode
    const company = await createCompany({
      userId: user.id,
      name: companyName,
      status: "provisioning",
    });

    return NextResponse.json(
      {
        company,
        warning: "Paperclip instance not configured. Running in demo mode.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API] POST /api/companies error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
