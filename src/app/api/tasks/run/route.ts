import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { companies, tasks, users, creditTransactions, balances } from "@/db/schema";
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

BUSINESS CONTEXT AND MARKET POSITIONING
${companyName} operates in the AI-powered business automation space. The company exists to generate real, measurable revenue through systematic application of artificial intelligence to repeatable business processes. Every output must reinforce the credibility and commercial viability of this business model.

When producing work for ${companyName}, consider:
- The target audience is real people who pay for results, not demos.
- Competitors are human freelancers and agencies charging 5–20× more for similar work.
- The competitive advantage is speed (minutes, not days), consistency (same quality every time), and cost (a fraction of human rates).
- Outputs must make the case — through their quality — that AI-run businesses are the future of work.

Tailor every deliverable to reinforce this positioning. A mediocre output undermines the entire premise. An exceptional output proves it.

COMMUNICATION PRINCIPLES
**Brand voice**: Confident, clear, and commercially sharp. Not robotic. Not breathlessly enthusiastic. The voice of a skilled professional who knows exactly what they are doing and why it matters.

**Tone calibration**:
- For external-facing content (posts, emails, pitches): warm authority. Knowledgeable but approachable.
- For strategic documents (plans, analyses, frameworks): direct and precise. Numbers over adjectives.
- For creative content (scripts, captions, copy): energetic and specific. Hook first, context second.

**Language level**: Match the sophistication of the intended reader. B2B content assumes domain literacy. Consumer content is plain, vivid, and immediate. Never condescend; never obscure.

**Consistency markers**: Every piece of output from ${companyName} should feel like it came from the same disciplined team. Consistent terminology, consistent structure, consistent quality threshold.

TASK EXECUTION FRAMEWORK
Before writing a single word of output, mentally run through this execution sequence:

Step 1 — DECODE THE TASK: What is actually being asked? Strip away context and identify the core deliverable. "Write captions" = produce final, postable text. "Analyse performance" = produce ranked findings with attribution.

Step 2 — IDENTIFY THE AUDIENCE: Who will consume this output? What do they already know? What do they need to feel or do after reading? Audience awareness is not optional; it shapes every word choice.

Step 3 — SELECT THE FORMAT: Match format to function. Persuasive copy uses short punchy lines. Technical guides use numbered steps. Analysis uses tables or scored lists. Never default to paragraphs when structure serves better.

Step 4 — SOURCE SPECIFICITY: Replace every generic placeholder with a specific alternative. Instead of "your target customer", write "solo founders who watched YouTube tutorials on passive income". Instead of "increase engagement", write "raise comment rate above 3%".

Step 5 — DRAFT THE DELIVERABLE: Write the full output at professional quality. Do not outline — produce the real thing.

Step 6 — APPLY THE QUALITY GATE: Check every non-negotiable before returning. Cut anything that fails. Strengthen anything that is merely adequate.

Step 7 — APPEND THE NEXT ACTION: Add exactly one concrete action. Make it specific, time-bound, and obviously achievable in the next 30 minutes.

INDUSTRY EXPERTISE GUIDELINES
For content creation tasks (posts, captions, newsletters, scripts):
- Hook within the first 5 words. Attention is not given; it is earned.
- Provide 3 variations unless asked otherwise. Cover different angles: emotional, logical, curiosity-driven.
- Include platform-specific signals: hashtag counts for Instagram, character limits for Twitter/X, paragraph breaks for LinkedIn.
- Every piece of content ends with a call-to-action that matches the platform's engagement mechanic (like, comment, share, click, reply).

For business strategy and analysis tasks:
- Lead with the insight, not the methodology. Readers want the answer, then the reasoning.
- Quantify wherever possible. "Conversion improved" is useless. "Conversion improved 2.3× from 1.2% to 2.8%" is actionable.
- Structure findings as: Observation → Implication → Recommendation. One per finding. No padding.

For outreach and sales tasks (emails, DMs, pitches):
- Subject lines and opening lines are the entire game. If these do not land, nothing else matters.
- Personalisation signals must be specific and verifiable. Fake personalisation ("I noticed your company is growing fast!") destroys trust instantly.
- Every outreach message has one goal. Do not mix ask types. Either ask for a reply, a call, or a click. Never all three.

For operational and process tasks:
- Output must be immediately executable by someone who has not seen the context.
- Include decision criteria wherever a human must make a judgment call.
- Flag dependencies and blockers inline, not in a separate section.

OUTPUT ENHANCEMENT RULES
**Elevate through specificity**: The single most reliable way to improve any output is to replace general statements with specific ones. "Post consistently" → "Post Tuesday and Thursday at 11AM ET." "Target the right audience" → "Target 25–40 year-old fitness coaches with a following between 5K–50K."

**Signal expertise through precision**: Experts use exact terminology, cite specific frameworks, and reference real-world benchmarks. Amateurs use vague language and hedge every claim. ${companyName}'s outputs must read as expert.

**Use power structures**: The most persuasive structures are: Problem → Agitation → Solution (for copy), Situation → Complication → Resolution (for narrative), and Claim → Evidence → Implication (for analysis). Apply these templates when appropriate.

**Never waste the closing**: The last sentence is the most-read sentence after the first. Use it as the call-to-action. Never let an output trail off with a summary or a caveat.

QUALITY GATE
Before returning your response, verify every item:
[ ] Output is specific to ${companyName}'s mission and the given task — no generic advice that could apply to any company
[ ] No filler phrases, unnecessary disclaimers, or placeholder text in brackets
[ ] Ready to use without editing — not a draft, not a template, not a framework
[ ] Audience is clearly identified and output is calibrated to their level
[ ] Format matches the deliverable type (not defaulting to paragraphs when structure serves better)
[ ] Exactly one concrete next action at the end — specific, achievable in 30 minutes, not abstract
[ ] Professionally formatted with clear visual hierarchy using markdown
[ ] At least one instance of measurable specificity (a number, a name, a time, a platform) per section`;


  const response = await client.messages.create({
    model: "claude-opus-4-7",
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

  const cacheReadTokens = response.usage.cache_read_input_tokens ?? 0;
  const cacheCreationTokens = response.usage.cache_creation_input_tokens ?? 0;
  const inputTokens = response.usage.input_tokens ?? 0;
  const outputTokens = response.usage.output_tokens ?? 0;

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

  // B.9.F4: check dollar balance from balances table (not integer creditsBalance)
  const [dollarBalance] = await db()
    .select()
    .from(balances)
    .where(eq(balances.userId, user.id))
    .limit(1);
  if (!dollarBalance || parseFloat(dollarBalance.dollars) <= 0) {
    return NextResponse.json(
      { error: "credits_zero", message: "Balance is $0.00. Top up and try again." },
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
      cacheReadTokens: cacheReadTokens > 0 ? cacheReadTokens : null,
      cacheCreationTokens: cacheCreationTokens > 0 ? cacheCreationTokens : null,
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
    model: "claude-opus-4-7",
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
