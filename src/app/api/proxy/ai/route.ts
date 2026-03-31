import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth-helpers";
import { getUserCredits, addCreditTransaction } from "@/lib/queries";
import { trackServerCreditsUsed } from "@/lib/analytics-server";

const AIRequestSchema = z.object({
  model: z.string().min(1),
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z.string(),
    })
  ),
  instance_id: z.string().uuid().optional(),
});

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
    max_tokens: 4096,
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
      max_tokens: 4096,
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

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = AIRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { model, messages, instance_id } = parsed.data;

    // Check credit balance
    const credits = await getUserCredits(user.id);
    if (credits.balance < 1) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          credits_balance: credits.balance,
          plan: credits.plan,
        },
        { status: 402 }
      );
    }

    // Determine provider and call appropriate API
    const provider = getProviderFromModel(model);
    let result: { content: string; tokens_input: number; tokens_output: number };

    if (provider === "anthropic") {
      result = await callAnthropicAPI(model, messages);
    } else {
      result = await callOpenAIAPI(model, messages);
    }

    // Deduct 1 credit
    const txResult = await addCreditTransaction({
      userId: user.id,
      amount: -1,
      type: "usage",
      description: `AI action: ${model}`,
      companyId: instance_id,
      provider,
      model,
      tokensInput: result.tokens_input,
      tokensOutput: result.tokens_output,
    });

    if (!txResult.success) {
      // Race condition: balance went to 0 between check and deduction
      return NextResponse.json(
        { error: "Insufficient credits" },
        { status: 402 }
      );
    }

    // Track analytics
    await trackServerCreditsUsed(user.id, 1, "ai_proxy", instance_id);

    return NextResponse.json({
      content: result.content,
      model,
      provider,
      tokens: {
        input: result.tokens_input,
        output: result.tokens_output,
      },
    });
  } catch (error) {
    console.error("[API] POST /api/proxy/ai error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
