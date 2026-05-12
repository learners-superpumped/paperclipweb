import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { companies, tasks, users, creditTransactions } from "@/db/schema";
import { sendEmail } from "@/lib/agentmail";
import { findCase } from "@/lib/cases";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const Body = z.object({
  companyId: z.string().uuid(),
  title: z.string().min(1).max(120),
  prompt: z.string().min(1).max(4000),
});

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
}): Promise<{ text: string; inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheCreationTokens: number }> {
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
    system: [
      {
        type: "text" as const,
        text: systemPrompt,
        cache_control: { type: "ephemeral" as const },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Task: ${title}\n\n${prompt}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const usageAny = response.usage as unknown as Record<string, number | undefined>;
  const cacheReadTokens = usageAny?.cache_read_input_tokens;
  const cacheCreationTokens = usageAny?.cache_creation_input_tokens;
  const inputTokens = response.usage?.input_tokens ?? 0;
  const outputTokens = response.usage?.output_tokens ?? 0;

  console.log("[tasks/run] cache_stats", {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cache_read_input_tokens: cacheReadTokens ?? 0,
    cache_creation_input_tokens: cacheCreationTokens ?? 0,
    cache_hit: (cacheReadTokens ?? 0) > 0,
  });

  return { text, inputTokens, outputTokens, cacheReadTokens: cacheReadTokens ?? 0, cacheCreationTokens: cacheCreationTokens ?? 0 };
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
  const { text: result, inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens } = await callClaude({
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
    description: JSON.stringify({
      task: parsed.title,
      cache_read: cacheReadTokens,
      cache_creation: cacheCreationTokens,
    }),
    provider: "anthropic",
    model: "claude-opus-4-5",
    tokensInput: inputTokens,
    tokensOutput: outputTokens,
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
