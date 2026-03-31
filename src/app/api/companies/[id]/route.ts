import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helpers";
import { getCompanyById, deleteCompany } from "@/lib/queries";
import {
  isPaperclipConfigured,
  archivePaperclipCompany,
  getPaperclipCompany,
} from "@/lib/paperclip";

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
    const company = await getCompanyById(id);

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    if (company.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Optionally enrich with live Paperclip data
    let paperclipStatus: string | null = null;
    if (isPaperclipConfigured() && company.paperclipCompanyId) {
      const pcCompany = await getPaperclipCompany(company.paperclipCompanyId);
      if (pcCompany) {
        paperclipStatus = pcCompany.status;
      }
    }

    return NextResponse.json({
      company,
      paperclipStatus,
    });
  } catch (error) {
    console.error("[API] GET /api/companies/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get company first to check ownership and get Paperclip ID
    const company = await getCompanyById(id);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    if (company.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Archive in Paperclip if configured
    if (isPaperclipConfigured() && company.paperclipCompanyId) {
      const archived = await archivePaperclipCompany(company.paperclipCompanyId);
      if (!archived) {
        console.warn(
          `[API] Failed to archive Paperclip company ${company.paperclipCompanyId}, proceeding with local delete`
        );
      }
    }

    await deleteCompany(id, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] DELETE /api/companies/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
