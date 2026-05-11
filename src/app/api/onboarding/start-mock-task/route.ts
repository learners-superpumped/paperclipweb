import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, mockCompanies } from "@/db/schema";
import { findCase } from "@/lib/cases";
import { sendEmail } from "@/lib/agentmail";

const Body = z.object({ caseId: z.string() });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const template = findCase(parsed.caseId);
  if (!template) {
    return NextResponse.json({ error: "unknown_case" }, { status: 404 });
  }

  const email = session.user.email;
  const [user] = await db()
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!user) {
    return NextResponse.json({ error: "no_user" }, { status: 404 });
  }

  const firstName = (user.name ?? "친구").split(" ")[0];

  const [mock] = await db()
    .insert(mockCompanies)
    .values({
      userId: user.id,
      caseId: template.id,
      companyName: template.company,
      payloadJson: JSON.stringify({
        employees: template.employees,
        sampleTask: template.sampleTask,
      }),
      firstTaskResult: template.sampleTask.presetResult,
      firstTaskEmailSentAt: new Date(),
    })
    .returning();

  // Result mail (best-effort, ignore failure)
  try {
    await sendEmail({
      to: email,
      subject: `[Paperclip] First task result from ${template.company}`,
      body: `
        <div style="max-width:560px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:32px 24px;">
          <h2 style="color:#0F172A;font-size:22px;">Hi ${firstName} — your first result is in</h2>
          <p style="color:#475569;font-size:14px;line-height:1.6;">
            ${template.company} ran <strong>"${template.sampleTask.title}"</strong>. Here's the output:
          </p>
          <pre style="white-space:pre-wrap;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:16px;font-size:13px;color:#334155;font-family:inherit;">${template.sampleTask.presetResult.replace(/</g, "&lt;")}</pre>
          <p style="color:#475569;font-size:14px;line-height:1.6;margin-top:24px;">
            If you liked it, start the real company for $29/mo. Everything you built in the mock — including ${template.company} — moves over as-is.
          </p>
          <a href="https://usepaperclip.app/checkout?case=${template.id}" style="display:inline-block;background:#4F46E5;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">Start for $29</a>
        </div>
      `,
    });
  } catch (err) {
    console.error("[onboarding] result mail failed", err);
  }

  return NextResponse.json({ ok: true, mockId: mock.id });
}
