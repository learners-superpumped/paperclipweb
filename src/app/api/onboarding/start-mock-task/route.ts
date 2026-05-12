import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, mockCompanies } from "@/db/schema";
import { findCase } from "@/lib/cases";
import { sendEmail } from "@/lib/agentmail";

export const maxDuration = 60;

const Body = z.object({ caseId: z.string() });

async function callClaude({
  title,
  prompt,
  companyName,
  mission,
}: {
  title: string;
  prompt: string;
  companyName: string;
  mission: string;
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const client = new Anthropic({ apiKey });

  const systemPrompt = `You are the AI team of ${companyName}. Company mission: ${mission}.

You produce high-quality, immediately usable outputs. Every deliverable is:
- Specific and concrete (no generic filler)
- Ready to use without editing
- Tied to a measurable next action (reply, click, save, book, or buy)

Format your response as a professional deliverable with a title, the work itself (3 variations when relevant), and one clear next step.`;

  const response = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1500,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Task: ${title}\n\n${prompt}`,
      },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

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

  const firstName = (user.name ?? "there").split(" ")[0];

  // Call real Claude API for the first wow
  let taskResult = template.sampleTask.presetResult;
  try {
    taskResult = await callClaude({
      title: template.sampleTask.title,
      prompt: template.sampleTask.description,
      companyName: template.company,
      mission: template.mission,
    });
  } catch (err) {
    console.error("[onboarding] claude call failed, using preset", err);
  }

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
      firstTaskResult: taskResult,
      firstTaskEmailSentAt: new Date(),
    })
    .returning();

  // Result mail (best-effort)
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
          <pre style="white-space:pre-wrap;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:16px;font-size:13px;color:#334155;font-family:inherit;">${taskResult.replace(/</g, "&lt;")}</pre>
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

  return NextResponse.json({ ok: true, mockId: mock.id, result: taskResult });
}
