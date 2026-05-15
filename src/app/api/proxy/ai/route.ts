import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { balances, balanceMovements, companies, creditTransactions, users } from "@/db/schema";
import { getAuthUser } from "@/lib/auth-helpers";

const AIRequestSchema = z.object({
  model: z.string().min(1).max(120),
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z.string().max(8000),
    })
  ).min(1).max(20),
  instance_id: z.string().uuid().optional(),
});

class ApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number
  ) {
    super(code);
  }
}

function getProviderFromModel(model: string): "anthropic" | "openai" {
  if (model.startsWith("claude") || model.startsWith("anthropic")) {
    return "anthropic";
  }
  return "openai";
}

async function callAnthropicAPI(
  model: string,
  messages: { role: string; content: string }[]
) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  // Convert messages: extract system message, keep user/assistant messages
  const systemMessages = messages.filter((m) => m.role === "system");
  const chatMessages = messages.filter((m) => m.role !== "system");

  const body: Record<string, unknown> = {
    model,
    max_tokens: 1200,
    messages: chatMessages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  };

  if (systemMessages.length > 0) {
    body.system = systemMessages.map((m) => m.content).join("\n");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[AI Proxy] Anthropic error:", response.status, errorText);
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.content?.[0]?.text ?? "",
    tokens_input: data.usage?.input_tokens ?? 0,
    tokens_output: data.usage?.output_tokens ?? 0,
  };
}

async function callOpenAIAPI(
  model: string,
  messages: { role: string; content: string }[]
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1200,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[AI Proxy] OpenAI error:", response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content ?? "",
    tokens_input: data.usage?.prompt_tokens ?? 0,
    tokens_output: data.usage?.completion_tokens ?? 0,
  };
}

function estimateCostDollars(
  provider: "anthropic" | "openai",
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  let inputPerMillion = 3;
  let outputPerMillion = 15;
  const lower = model.toLowerCase();

  if (provider === "anthropic") {
    if (lower.includes("haiku")) {
      inputPerMillion = 0.8;
      outputPerMillion = 4;
    } else if (lower.includes("opus")) {
      inputPerMillion = 15;
      outputPerMillion = 75;
    }
  } else {
    if (lower.includes("mini")) {
      inputPerMillion = 0.15;
      outputPerMillion = 0.6;
    } else {
      inputPerMillion = 2.5;
      outputPerMillion = 10;
    }
  }

  const raw =
    (inputTokens / 1_000_000) * inputPerMillion +
    (outputTokens / 1_000_000) * outputPerMillion;
  return Math.max(0.0001, Math.ceil(raw * 10000) / 10000);
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;

    const body = await req.json();
    const parsed = AIRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { model, messages, instance_id } = parsed.data;
    const [dbUser] = await db()
      .select({
        id: users.id,
        plan: users.plan,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!dbUser || dbUser.plan !== "pro") {
      return NextResponse.json({ error: "paid_plan_required" }, { status: 402 });
    }

    let companyId: string | undefined;
    if (instance_id) {
      const [company] = await db()
        .select({ id: companies.id, status: companies.status })
        .from(companies)
        .where(and(eq(companies.id, instance_id), eq(companies.userId, userId)))
        .limit(1);
      if (!company) {
        return NextResponse.json({ error: "company_not_found" }, { status: 404 });
      }
      if (company.status !== "running") {
        return NextResponse.json({ error: "company_not_running" }, { status: 403 });
      }
      companyId = company.id;
    } else {
      const [company] = await db()
        .select({ id: companies.id })
        .from(companies)
        .where(and(eq(companies.userId, userId), eq(companies.status, "running")))
        .limit(1);
      if (!company) {
        return NextResponse.json({ error: "active_company_required" }, { status: 403 });
      }
      companyId = company.id;
    }

    const provider = getProviderFromModel(model);
    let result: { content: string; tokens_input: number; tokens_output: number } | undefined;
    let billedDollars = "0.0000";

    // Keep the balance check and provider call serialized per user so two
    // parallel requests cannot both spend the same remaining prepaid balance.
    await db().transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${userId}))`);
      const [freshBalance] = await tx
        .select({ dollars: balances.dollars })
        .from(balances)
        .where(eq(balances.userId, userId))
        .limit(1);
      const freshDollars = parseFloat(freshBalance?.dollars ?? "0");
      if (!Number.isFinite(freshDollars) || freshDollars <= 0) {
        throw new ApiError("insufficient_balance", 402);
      }

      result = provider === "anthropic"
        ? await callAnthropicAPI(model, messages)
        : await callOpenAIAPI(model, messages);

      const costDollars = estimateCostDollars(
        provider,
        model,
        result.tokens_input,
        result.tokens_output
      );
      const finalCharge = Math.min(freshDollars, costDollars).toFixed(4);
      billedDollars = finalCharge;
      await tx
        .update(balances)
        .set({
          dollars: sql`GREATEST(${balances.dollars} - ${finalCharge}, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(balances.userId, userId));
      await tx.insert(balanceMovements).values({
        userId,
        kind: "spend",
        dollarsDelta: `-${finalCharge}`,
        reference: companyId,
      });
      await tx.insert(creditTransactions).values({
        userId,
        companyId,
        amount: -1,
        type: "usage",
        description: JSON.stringify({ dollars: finalCharge }),
        provider,
        model,
        tokensInput: result.tokens_input,
        tokensOutput: result.tokens_output,
      });
    });

    if (!result) {
      throw new Error("AI provider did not return a response");
    }

    return NextResponse.json({
      content: result.content,
      model,
      provider,
      tokens: {
        input: result.tokens_input,
        output: result.tokens_output,
      },
      billing: {
        estimated_cost_dollars: billedDollars,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    console.error("[API] POST /api/proxy/ai error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
