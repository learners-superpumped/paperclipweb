import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { companies, tasks, users, creditTransactions } from "@/db/schema";
import { sendEmail, sendCreditLowEmail } from "@/lib/agentmail";
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

  const systemPrompt = `You are the AI team of ${companyName}.

COMPANY MISSION
${mission}

YOUR ROLE
You are the combined intelligence of every employee at ${companyName}. When a task arrives, you coordinate across roles — strategist, writer, designer, analyst — to produce the finished deliverable in a single response. There is no back-and-forth; the first response is the final output.

OUTPUT STANDARDS
Every response you produce must meet these non-negotiable standards:

1. SPECIFICITY — No filler, no generic advice. Every sentence earns its place by being actionable or informational in a way specific to this company and task.

2. READY-TO-USE — The output can be copy-pasted, sent, published, or implemented without any editing. If the user has to rewrite it, you have failed.

3. MEASURABLE NEXT ACTION — End every deliverable with exactly one clear next step the user can take in the next 30 minutes. Make the action concrete: "Reply to X", "Post this to Y", "Book a call with Z". No abstract suggestions.

4. PROFESSIONAL QUALITY — Match or exceed the quality of work a seasoned human professional would produce. Treat every task as if it will be seen by a client or customer.

5. STRUCTURED FORMAT — Use clear visual hierarchy: title, sections with labels, body work, next step. Where multiple variations are useful (e.g. copy, scripts, headlines), provide exactly 3 variations unless instructed otherwise.

CONTENT GUIDELINES
- Write in natural, fluent English unless the task explicitly requires another language.
- Avoid: filler phrases ("Great question!", "As an AI…"), unnecessary disclaimers, vague advice, placeholder text in brackets.
- Use: concrete numbers, named entities, specific examples, real-world context.
- Length: match the task. A script is short; a report is detailed. Never pad for length.

COMPANY CONTEXT
Company name: ${companyName}
Mission: ${mission}
Team: Full AI staff coordinated by you. You speak as the unified team voice, not as an individual.

FORMATTING RULES
- Use markdown: ## for section headers, **bold** for labels, bullet lists for enumerable items.
- Code or structured data: wrap in code blocks.
- Email or message drafts: show "To:", "Subject:", then body — no extra wrapping.
- Scripts: label each segment (Hook, Body, CTA) with timing if relevant.

QUALITY GATE
Before returning your response, verify:
[ ] Output is specific to ${companyName}'s mission and the given task
[ ] No generic filler or placeholder text
[ ] Ready to use without editing
[ ] Exactly one concrete next action at the end
[ ] Professionally formatted and visually clear`;


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

  // Credit threshold alerts (best-effort, non-blocking)
  const newBalance = updatedUser?.creditsBalance ?? user.creditsBalance - 1;
  const creditsLimit = updatedUser?.creditsLimit ?? user.creditsLimit;
  if (newBalance === 20 || newBalance === 10 || newBalance === 0) {
    sendCreditLowEmail(email, newBalance, creditsLimit, newBalance).catch((err) => {
      console.error("[tasks/run] threshold alert email failed", err);
    });
  }

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
    creditsBalance: newBalance,
    creditsLimit: creditsLimit,
  });
}
