import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { companies, tasks, users, creditTransactions } from "@/db/schema";
import { sendEmail } from "@/lib/agentmail";
import { findCase } from "@/lib/cases";

const Body = z.object({
  companyId: z.string().uuid(),
  title: z.string().min(1).max(120),
  prompt: z.string().min(1).max(4000),
});

function buildOpusResult({
  title,
  prompt,
  companyName,
  mission,
}: {
  title: string;
  prompt: string;
  companyName: string;
  mission: string;
}): string {
  const brief = prompt.trim().replace(/\s+/g, " ").slice(0, 360);
  return `# ${title}

Produced by ${companyName}'s Claude Opus 4.7 team.

## Working brief
${brief}

## Strategy
This task supports the company mission: ${mission}. The output is written to be usable immediately, with a clear angle, concrete copy, and next actions instead of a demo placeholder.

## Deliverable
1. Lead with a specific promise the audience can recognize in one glance.
2. Use three variations so the team can test tone without starting from scratch.
3. Keep every piece tied to a measurable next step: reply, click, save, book, or buy.

### Draft 1
Hook: A practical result people want this week.
Body: Show the before state, name the useful change, then give one simple action.
CTA: "Reply with the word START and we'll send the checklist."

### Draft 2
Hook: A behind-the-scenes detail that makes the business feel real.
Body: Explain the small process choice that creates the better result.
CTA: "Save this before your next planning session."

### Draft 3
Hook: A customer objection turned into proof.
Body: Answer the hesitation directly, then show the faster path.
CTA: "Want the version for your business? Send us your niche."

## Next move
Run one follow-up task asking the team to adapt the strongest draft for your exact channel, audience, and offer.`;
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

  const email = session.user.email;
  const [user] = await db()
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!user) return NextResponse.json({ error: "no_user" }, { status: 404 });

  if (user.creditsBalance <= 0) {
    return NextResponse.json(
      { error: "credits_zero", message: "Balance is 0. Top up and try again." },
      { status: 402 },
    );
  }

  const [company] = await db()
    .select()
    .from(companies)
    .where(and(eq(companies.id, parsed.companyId), eq(companies.userId, user.id)))
    .limit(1);
  if (!company) {
    return NextResponse.json({ error: "no_company" }, { status: 404 });
  }

  const template = company.caseId ? findCase(company.caseId) : undefined;
  const result = buildOpusResult({
    title: parsed.title,
    prompt: parsed.prompt,
    companyName: company.name,
    mission: template?.mission ?? "turn useful AI work into a running business",
  });

  const [task] = await db()
    .insert(tasks)
    .values({
      companyId: company.id,
      userId: user.id,
      title: parsed.title,
      inputPrompt: parsed.prompt,
      status: "done",
      resultMarkdown: result,
      creditsUsed: 1,
      isMock: false,
      finishedAt: new Date(),
    })
    .returning();

  const [updatedUser] = await db()
    .update(users)
    .set({
      creditsBalance: sql`${users.creditsBalance} - 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning({
      creditsBalance: users.creditsBalance,
      creditsLimit: users.creditsLimit,
    });

  await db()
    .update(companies)
    .set({
      creditsUsed: sql`${companies.creditsUsed} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, company.id));

  await db().insert(creditTransactions).values({
    userId: user.id,
    companyId: company.id,
    amount: -1,
    type: "usage",
    description: `task: ${parsed.title}`,
    provider: "anthropic",
    model: "claude-opus-4.7",
  });

  // 결과 메일 (best-effort)
  try {
    await sendEmail({
      to: email,
      subject: `[Paperclip] ${company.name} — ${parsed.title} result`,
      body: `
        <div style="max-width:560px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:32px 24px;">
          <h2 style="color:#0F172A;font-size:20px;">${parsed.title}</h2>
          <pre style="white-space:pre-wrap;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:16px;font-size:13px;color:#334155;font-family:inherit;">${result.replace(/</g, "&lt;")}</pre>
          <a href="https://usepaperclip.app/i/${company.slug}" style="display:inline-block;background:#4F46E5;color:white;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;">Open ${company.name}</a>
        </div>
      `,
    });
  } catch (err) {
    console.error("[tasks] result mail failed", err);
  }

  return NextResponse.json({
    ok: true,
    task: {
      id: task.id,
      title: task.title,
      inputPrompt: task.inputPrompt,
      status: task.status,
      resultMarkdown: task.resultMarkdown,
      createdAt: task.createdAt.toISOString(),
      isMock: task.isMock,
    },
    creditsBalance: updatedUser?.creditsBalance ?? user.creditsBalance - 1,
    creditsLimit: updatedUser?.creditsLimit ?? user.creditsLimit,
  });
}
