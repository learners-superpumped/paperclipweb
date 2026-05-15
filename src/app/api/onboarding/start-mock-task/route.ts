import { NextResponse } from "next/server";
import { z } from "zod";
import { findCase } from "@/lib/cases";

const Body = z.object({
  caseId: z.string().min(1).max(80),
});

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type TrialCacheEntry = {
  result: string;
  createdAt: number;
  model?: string;
};

const rateLimits = new Map<string, RateLimitBucket>();
const trialCache = new Map<string, TrialCacheEntry>();
let workingTrialModel: string | undefined;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 8;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function clientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "unknown";
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const bucket = rateLimits.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_LIMIT_MAX) return false;
  bucket.count += 1;
  return true;
}

function textFromAnthropicResponse(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const content = (data as { content?: unknown }).content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (part && typeof part === "object" && "text" in part) {
        const text = (part as { text?: unknown }).text;
        return typeof text === "string" ? text : "";
      }
      return "";
    })
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function trialModelCandidates(): string[] {
  return Array.from(
    new Set(
      [
        workingTrialModel,
        process.env.ANTHROPIC_TRIAL_MODEL,
        "claude-3-haiku-20240307",
        "claude-3-5-haiku-20241022",
        "claude-sonnet-4-20250514",
        "claude-3-7-sonnet-20250219",
      ].filter((model): model is string => Boolean(model))
    )
  );
}

export async function POST(req: Request) {
  const key = clientKey(req);
  if (!checkRateLimit(key)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
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

  const now = Date.now();
  const cached = trialCache.get(template.id);
  if (cached && now - cached.createdAt < CACHE_TTL_MS) {
    return NextResponse.json({ ok: true, result: cached.result, source: "cache", model: cached.model });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: true, result: template.sampleTask.presetResult, source: "preset" });
  }

  try {
    const prompt = [
      `Company: ${template.company}`,
      `Mission: ${template.mission}`,
      `Team: ${template.employees.map((employee) => `${employee.name} (${employee.role}): ${employee.bio}`).join("\n")}`,
      `Task title: ${template.sampleTask.title}`,
      `Task brief: ${template.sampleTask.description}`,
      "Generate the user's sample task output. Be concrete, useful, and formatted in Markdown. Do not mention that this is a demo.",
    ].join("\n\n");

    for (const model of trialModelCandidates()) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 900,
          temperature: 0.7,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error(
          "[onboarding/start-mock-task] Anthropic failed:",
          model,
          res.status,
          errText.slice(0, 300)
        );
        if (res.status === 404 || res.status === 400) {
          continue;
        }
        return NextResponse.json({ ok: true, result: template.sampleTask.presetResult, source: "preset" });
      }

      const result = textFromAnthropicResponse(await res.json()) || template.sampleTask.presetResult;
      workingTrialModel = model;
      trialCache.set(template.id, { result, createdAt: now, model });
      return NextResponse.json({ ok: true, result, source: "ai", model });
    }

    return NextResponse.json({ ok: true, result: template.sampleTask.presetResult, source: "preset" });
  } catch (err) {
    console.error("[onboarding/start-mock-task] failed:", err);
    return NextResponse.json({ ok: true, result: template.sampleTask.presetResult, source: "preset" });
  }
}
