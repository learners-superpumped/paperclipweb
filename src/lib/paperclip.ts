import { z } from "zod";

// ─── Configuration ───

const PAPERCLIP_API_URL = process.env.PAPERCLIP_API_URL ?? "";
const PAPERCLIP_API_KEY = process.env.PAPERCLIP_API_KEY ?? "";
const PAPERCLIP_AUTH_EMAIL = process.env.PAPERCLIP_AUTH_EMAIL ?? "";
const PAPERCLIP_AUTH_PASSWORD = process.env.PAPERCLIP_AUTH_PASSWORD ?? "";

// ─── Session Token Cache ───

let cachedSessionCookie: string | null = null;
let sessionExpiresAt = 0;

async function getPaperclipSessionCookie(): Promise<string | null> {
  if (!PAPERCLIP_AUTH_EMAIL || !PAPERCLIP_AUTH_PASSWORD) return null;
  if (cachedSessionCookie && Date.now() < sessionExpiresAt) return cachedSessionCookie;

  const baseUrl = PAPERCLIP_API_URL.replace(/\/+$/, "");
  const res = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: baseUrl },
    body: JSON.stringify({ email: PAPERCLIP_AUTH_EMAIL, password: PAPERCLIP_AUTH_PASSWORD }),
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("[Paperclip] Session auth failed:", res.status);
    return null;
  }

  // Strategy 1: getSetCookie() API (Node.js 18.14+)
  let cookiePair: string | null = null;
  const headersAny = res.headers as unknown as { getSetCookie?: () => string[] };
  if (typeof headersAny.getSetCookie === "function") {
    const setCookies = headersAny.getSetCookie();
    const pairs = setCookies.map((c) => c.split(";")[0]).filter(Boolean);
    if (pairs.length > 0) cookiePair = pairs.join("; ");
  }

  // Strategy 2: fallback via get('set-cookie') (works in all Node.js/fetch environments)
  if (!cookiePair) {
    const rawSetCookie = res.headers.get("set-cookie");
    if (rawSetCookie) {
      // The raw header may contain "name=value; Path=...; ..." — extract just name=value
      cookiePair = rawSetCookie.split(";")[0].trim();
    }
  }

  if (cookiePair) {
    cachedSessionCookie = cookiePair;
    sessionExpiresAt = Date.now() + 55 * 60 * 1000;
    return cookiePair;
  }

  console.error("[Paperclip] Could not extract session cookie from auth response");
  return null;
}

/**
 * Whether the Paperclip backend is configured.
 * When false, instance creation works in "demo mode" — records are saved
 * but no real Paperclip company is provisioned.
 */
export function isPaperclipConfigured(): boolean {
  // Configured if we have URL + (API key OR email/password auth)
  return PAPERCLIP_API_URL.length > 0 && (
    PAPERCLIP_API_KEY.length > 0 ||
    (PAPERCLIP_AUTH_EMAIL.length > 0 && PAPERCLIP_AUTH_PASSWORD.length > 0)
  );
}

// ─── Response Schemas (Zod) ───

const PaperclipCompanySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  status: z.string(), // active, paused, archived
  budgetMonthlyCents: z.number().optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PaperclipCompany = z.infer<typeof PaperclipCompanySchema>;

const PaperclipCompanyListSchema = z.array(PaperclipCompanySchema);

// ─── HTTP Helper ───

async function paperclipFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  if (!isPaperclipConfigured()) {
    throw new Error("Paperclip is not configured. Set PAPERCLIP_API_URL and PAPERCLIP_API_KEY, or PAPERCLIP_AUTH_EMAIL and PAPERCLIP_AUTH_PASSWORD.");
  }

  const url = `${PAPERCLIP_API_URL.replace(/\/+$/, "")}${path}`;

  const baseUrl = PAPERCLIP_API_URL.replace(/\/+$/, "");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Origin: baseUrl,
  };

  if (PAPERCLIP_API_KEY) {
    headers.Authorization = `Bearer ${PAPERCLIP_API_KEY}`;
  } else {
    const cookie = await getPaperclipSessionCookie();
    if (cookie) {
      headers.Cookie = cookie;
    }
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  return res;
}

// ─── Company Operations ───

/**
 * Create a new company in the Paperclip instance.
 * Returns the created company or null on failure.
 */
export async function createPaperclipCompany(
  name: string,
  description?: string
): Promise<PaperclipCompany | null> {
  try {
    const res = await paperclipFetch("/api/companies", {
      method: "POST",
      body: JSON.stringify({
        name,
        description: description ?? `Managed by paperclipweb`,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("[Paperclip] Create company failed:", res.status, errBody);
      return null;
    }

    const data = await res.json();
    const parsed = PaperclipCompanySchema.safeParse(data);
    if (!parsed.success) {
      console.error("[Paperclip] Unexpected response shape:", parsed.error.message);
      // Still try to extract id and name from raw response
      if (data && typeof data.id === "string") {
        return data as PaperclipCompany;
      }
      return null;
    }

    return parsed.data;
  } catch (err) {
    console.error("[Paperclip] Create company error:", err);
    return null;
  }
}

/**
 * Create a one-time invite for a paperclipweb subscriber to enter their own
 * paperclip company directly. The returned URL is what the user should be
 * redirected/iframed into — that is the "real paperclip experience" the user
 * paid for.
 *
 * Allowed join types: `human` (regular user) by default. Returns full URL or null.
 */
export async function createCompanyInvite(
  companyId: string,
  humanRole: "owner" | "admin" | "operator" | "viewer" = "owner",
): Promise<{ token: string; url: string; expiresAt: string } | null> {
  try {
    const res = await paperclipFetch(`/api/companies/${companyId}/invites`, {
      method: "POST",
      body: JSON.stringify({
        allowedJoinTypes: "human",
        humanRole,
      }),
    });
    if (!res.ok) {
      console.error("[Paperclip] Create invite failed:", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = (await res.json()) as { token?: string; expiresAt?: string };
    if (!data.token) return null;
    const baseUrl = PAPERCLIP_API_URL.replace(/\/api\/?$/, "").replace(/\/+$/, "");
    return {
      token: data.token,
      url: `${baseUrl}/invite/${data.token}`,
      expiresAt: data.expiresAt ?? "",
    };
  } catch (err) {
    console.error("[Paperclip] Create invite error:", err);
    return null;
  }
}

/**
 * Get a single company by ID.
 */
export async function getPaperclipCompany(
  companyId: string
): Promise<PaperclipCompany | null> {
  try {
    const res = await paperclipFetch(`/api/companies/${companyId}`);

    if (!res.ok) {
      console.error("[Paperclip] Get company failed:", res.status);
      return null;
    }

    const data = await res.json();
    const parsed = PaperclipCompanySchema.safeParse(data);
    return parsed.success ? parsed.data : null;
  } catch (err) {
    console.error("[Paperclip] Get company error:", err);
    return null;
  }
}

/**
 * List all companies in the Paperclip instance.
 */
export async function listPaperclipCompanies(): Promise<PaperclipCompany[]> {
  try {
    const res = await paperclipFetch("/api/companies");

    if (!res.ok) {
      console.error("[Paperclip] List companies failed:", res.status);
      return [];
    }

    const data = await res.json();
    const parsed = PaperclipCompanyListSchema.safeParse(data);
    return parsed.success ? parsed.data : [];
  } catch (err) {
    console.error("[Paperclip] List companies error:", err);
    return [];
  }
}

/**
 * Archive a company in Paperclip (soft delete).
 */
export async function archivePaperclipCompany(
  companyId: string
): Promise<boolean> {
  try {
    const res = await paperclipFetch(`/api/companies/${companyId}/archive`, {
      method: "POST",
    });

    if (!res.ok) {
      console.error("[Paperclip] Archive company failed:", res.status);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[Paperclip] Archive company error:", err);
    return false;
  }
}

/**
 * Build a GitHub tree URL from a shorthand source ("owner/repo/path") + ref.
 * paperclip's `portabilitySourceSchema` only accepts a full URL (z.string().url()), not
 * a separate (source, ref) pair. So we assemble the canonical GitHub tree URL here.
 */
function buildGithubTreeUrl(source: string, ref: string): string {
  if (/^https?:\/\//i.test(source)) return source;
  const parts = source.split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new Error(
      `[Paperclip] templateSource must be "owner/repo[/path]" or a full URL, got: ${source}`
    );
  }
  const [owner, repo, ...rest] = parts;
  const subpath = rest.join("/");
  const treeSuffix = subpath ? `tree/${ref}/${subpath}` : `tree/${ref}`;
  return `https://github.com/${owner}/${repo}/${treeSuffix}`;
}

/**
 * Build the portability request body for paperclip's /api/companies/import endpoints.
 * Conforms to `companyPortabilityImportSchema` (paperclip OSS — see
 * packages/shared/src/validators/company-portability.ts):
 *   - source: discriminatedUnion("type", [ {type:"github", url}, {type:"inline", files} ])
 *   - target: discriminatedUnion("mode", [ {mode:"new_company", newCompanyName}, ... ])
 */
function buildImportBody(githubUrl: string, companyName: string) {
  return {
    source: { type: "github" as const, url: githubUrl },
    target: { mode: "new_company" as const, newCompanyName: companyName },
    include: {
      company: true,
      agents: true,
      projects: true,
      issues: true,
      skills: true,
    },
    agents: "all" as const,
    collisionStrategy: "rename" as const,
  };
}

/**
 * Import a company from a template repository.
 * Falls back to createPaperclipCompany if import API fails.
 */
export async function importPaperclipCompany(
  templateSource: string,
  ref: string,
  companyName: string
): Promise<PaperclipCompany | null> {
  try {
    let githubUrl: string;
    try {
      githubUrl = buildGithubTreeUrl(templateSource, ref);
    } catch (err) {
      console.error("[Paperclip] buildGithubTreeUrl failed:", err);
      return createPaperclipCompany(companyName, `paperclipweb subscriber instance`);
    }

    const body = buildImportBody(githubUrl, companyName);
    const bodyJson = JSON.stringify(body);

    const previewRes = await paperclipFetch("/api/companies/import/preview", {
      method: "POST",
      body: bodyJson,
    });
    if (!previewRes.ok) {
      const errText = await previewRes.text().catch(() => "");
      console.warn(
        `[Paperclip] Import preview failed (${previewRes.status}): ${errText.slice(0, 300)} — falling back to createPaperclipCompany`
      );
      return createPaperclipCompany(companyName, `paperclipweb subscriber instance`);
    }

    const importRes = await paperclipFetch("/api/companies/import", {
      method: "POST",
      body: bodyJson,
    });
    if (!importRes.ok) {
      const errText = await importRes.text().catch(() => "");
      console.warn(
        `[Paperclip] Import failed (${importRes.status}): ${errText.slice(0, 300)} — falling back to createPaperclipCompany`
      );
      return createPaperclipCompany(companyName, `paperclipweb subscriber instance`);
    }

    const data = await importRes.json();
    // paperclip's applyImport returns an ImportResult shape. The created company can
    // surface either at the top level or nested. Try common shapes before falling back.
    const candidate =
      (data && typeof data === "object" && (data as Record<string, unknown>).company) ||
      (data && typeof data === "object" && (data as Record<string, unknown>).createdCompany) ||
      data;
    const parsed = PaperclipCompanySchema.safeParse(candidate);
    if (parsed.success) return parsed.data;
    if (candidate && typeof (candidate as Record<string, unknown>).id === "string") {
      return candidate as PaperclipCompany;
    }
    console.warn(
      "[Paperclip] Import succeeded but response shape unrecognized; falling back to createPaperclipCompany"
    );
    return createPaperclipCompany(companyName, `paperclipweb subscriber instance`);
  } catch (err) {
    console.error("[Paperclip] importPaperclipCompany error:", err);
    return createPaperclipCompany(companyName, `paperclipweb subscriber instance`);
  }
}

/**
 * List agents in a company.
 */
export async function listCompanyAgents(
  companyId: string
): Promise<Array<{ id: string; slug: string; status: string }>> {
  try {
    const res = await paperclipFetch(`/api/companies/${companyId}/agents`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.filter((a) => a && typeof a.id === "string");
  } catch {
    return [];
  }
}

/**
 * Approve an agent to start working.
 */
export async function approveAgent(agentId: string): Promise<boolean> {
  try {
    const res = await paperclipFetch(`/api/agents/${agentId}/approve`, { method: "POST" });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Resume a paused agent.
 */
export async function resumeAgent(agentId: string): Promise<boolean> {
  try {
    const res = await paperclipFetch(`/api/agents/${agentId}/resume`, { method: "POST" });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Sync the monthly budget for a company based on current dollar balance.
 */
export async function syncCompanyBudget(
  companyId: string,
  balanceDollars: number
): Promise<boolean> {
  try {
    const res = await paperclipFetch(`/api/companies/${companyId}/budgets`, {
      method: "PATCH",
      body: JSON.stringify({ budgetMonthlyCents: Math.floor(balanceDollars * 100) }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Unarchive a previously archived company.
 */
export async function unarchivePaperclipCompany(companyId: string): Promise<boolean> {
  try {
    const res = await paperclipFetch(`/api/companies/${companyId}/unarchive`, { method: "POST" });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Permanently delete a company from Paperclip.
 */
export async function deletePaperclipCompany(companyId: string): Promise<boolean> {
  try {
    const res = await paperclipFetch(`/api/companies/${companyId}`, { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Poll until an in-progress issue/work product appears for a company, or timeout.
 */
export async function pollForFirstWorkProduct(
  paperclipCompanyId: string,
  timeoutMs: number
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await paperclipFetch(`/api/companies/${paperclipCompanyId}/issues?status=in-progress`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return true;
      }
    } catch {
      // Ignore transient errors and keep polling
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  return false;
}

/**
 * Update a company's properties.
 */
export async function updatePaperclipCompany(
  companyId: string,
  updates: {
    name?: string;
    description?: string;
    budgetMonthlyCents?: number;
  }
): Promise<PaperclipCompany | null> {
  try {
    const res = await paperclipFetch(`/api/companies/${companyId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      console.error("[Paperclip] Update company failed:", res.status);
      return null;
    }

    const data = await res.json();
    const parsed = PaperclipCompanySchema.safeParse(data);
    return parsed.success ? parsed.data : null;
  } catch (err) {
    console.error("[Paperclip] Update company error:", err);
    return null;
  }
}

/**
 * Build the URL for accessing a company's dashboard in the Paperclip UI.
 * This returns the web UI URL, not the API URL.
 */
export function getPaperclipCompanyUrl(companyId: string): string {
  // The Paperclip UI runs on the same host as the API, just without /api prefix
  const baseUrl = PAPERCLIP_API_URL.replace(/\/api\/?$/, "").replace(/\/+$/, "");
  return `${baseUrl}/companies/${companyId}`;
}

// ─── Skill Operations ───

const GSTACK_SKILLS = [
  {
    slug: "gstack-officehour",
    name: "gstack-officehour",
    description:
      "Use when the user wants to evaluate a startup idea with Garry Tan's 6 forcing questions, run a gstack office hours session, pitch an idea, get structured YC-style feedback, validate startup hypotheses, or grade an idea.",
    markdown: `---
name: gstack-officehour

description: >-
  Use when the user wants to evaluate a startup idea with Garry Tan's 6 forcing
  questions, run a gstack office hours session, pitch an idea, get structured
  YC-style feedback, validate startup hypotheses, or grade an idea. Trigger
  phrases: "gstack", "office hours", "evaluate my idea", "pitch my startup",
  "Garry Tan questions", "run gstack", "아이디어 검증", "스타트업 평가".

allowed-tools:
---

# gstack Office Hours

Garry Tan의 YC Office Hours 프레임워크를 구현합니다. 사용자의 아이디어를 6가지 forcing question으로 분석하고 각 답변에 즉시 피드백을 줍니다.

## Session structure

먼저 사용자에게 아이디어를 한 문장으로 말해달라고 합니다.

그런 다음 6가지 질문을 **하나씩** 합니다. 각 질문 후 사용자의 답변을 받고, Garry Tan 스타일로 pushback을 줍니다.

### 6 forcing questions

1. **Q1 — Who is this for, very specifically?**
   Name the exact person, role, or situation. Broad markets do not count.

2. **Q2 — What pain are they paying for today?**
   Show the current workaround, budget, or wasted time.

3. **Q3 — Why now? What changed in the world?**
   Point to a new behavior, platform shift, regulation, or cost curve.

4. **Q4 — What's the V1 you can build in 4 weeks?**
   Keep the wedge small enough to ship and learn from.

5. **Q5 — How will you reach the first 100 users?**
   Name the channel and the first message, not a vague growth plan.

6. **Q6 — What does success look like at month 6?**
   Pick measurable traction that would make the next step obvious.

## Scoring per question

Each answer gets a score:
- **Strong** — specific, testable, evidence-backed
- **Moderate** — useful direction, but one assumption too soft to test
- **Weak** — too broad to act on; name the specific user/pain/proof point

Score + 1-sentence reason + 2-sentence pushback. Then move to the next question.

## After Q6

1. **Grade** — A (85+), B+ (75+), B (60+), C+ (45+), C (below 45). Weight all 6 scores equally.
2. **Refined idea** — one sentence that sharpens the original with what you learned across the 6 questions.
3. **Homework** — 3 concrete next steps, one per weakest answer.

## Tone principles (enforce throughout)

- Direct. Never pad with "great question" or "that's interesting."
- Specific. Every pushback names a specific missing element (not "needs more detail").
- Falsifiable. Every suggestion ends with what would prove or disprove it.
- Garry-voice. Terse. Affirming when strong. Relentless on weak spots.
`,
  },
  {
    slug: "gstack-research",
    name: "gstack-research",
    description:
      "Use when the user wants to research market size, competition, existing solutions, customer signals, or validate assumptions for a startup idea.",
    markdown: `---
name: gstack-research

description: >-
  Use when the user wants to research market size, competition, existing
  solutions, customer signals, or validate assumptions for a startup idea.
  Trigger phrases: "research my idea", "market research", "who else is doing
  this", "validate assumptions", "시장조사", "경쟁사 분석", "타당성 검증".

allowed-tools:
---

# gstack Research

아이디어의 시장·경쟁·고객·타이밍을 빠르게 리서치합니다.

## Structure

1. 아이디어를 받는다.
2. 5개 축으로 분석:
   - **Market size**: 이 문제를 가진 사람이 실제로 얼마나 있나? (bottom-up estimate)
   - **Existing solutions**: 지금 사람들은 어떻게 해결하나? (workaround, competitor, manual)
   - **Customer signal**: 누군가 이 문제에 돈을 지불한 증거가 있나? (Reddit, ProductHunt, Job board, App store)
   - **Market timing**: 왜 지금인가? (새로운 API, 규제 변화, 플랫폼 shift, 비용 곡선)
   - **Wedge**: 처음 100명을 어디서 찾나? (specific community, channel, job title)

3. 각 축에서 **Confirmed / Uncertain / Red flag** 판정 + 1줄 근거.
4. 마지막: "이 중 가장 불확실한 가정 하나와, 1주 안에 검증하는 방법".

## Tone
Garry Tan처럼: 직접적, 구체적, 빠름. 칭찬 없이 바로 본론.
`,
  },
  {
    slug: "gstack-brainstorm",
    name: "gstack-brainstorm",
    description:
      "Use when the user wants to generate startup ideas, explore pivots, find adjacent opportunities, or brainstorm variations on a concept.",
    markdown: `---
name: gstack-brainstorm

description: >-
  Use when the user wants to generate startup ideas, explore pivots, find
  adjacent opportunities, or brainstorm variations on a concept.
  Trigger phrases: "brainstorm ideas", "what else could I build", "pivot ideas",
  "adjacent ideas", "아이디어 발산", "다른 방향", "피벗", "아이디어 변형".

allowed-tools:
---

# gstack Brainstorm

아이디어를 6가지 각도로 발산·변형합니다.

## Structure

1. 사용자의 관심 도메인 또는 초기 아이디어를 받는다.
2. **6가지 각도**에서 아이디어 변형:
   - **Niche down**: 더 좁은 타겟 (정확한 직함 + 회사 유형)
   - **Scale up**: 더 큰 인접 시장
   - **Adjacent problem**: 같은 고객의 다른 통증
   - **Distribution angle**: 다른 채널로 동일 솔루션
   - **Timing play**: 12개월 후 10배 쉬워지는 이유
   - **Contrarian**: 이 공간에서 모두가 잘못 생각하는 것

3. 각 변형: 아이디어 1줄 + 가치를 결정하는 가장 날카로운 질문 1개.
4. 마지막: "당신 배경에 가장 잘 맞는 변형 하나 + 이번 주 첫 번째 행동".

## Tone
Garry Tan: 빠르고 직접적. 아이디어는 구체적인 고객과 행동으로 묘사. 칭찬 없음.
`,
  },
] as const;

export async function listCompanySkills(
  companyId: string
): Promise<Array<{ id: string; slug: string; name: string }>> {
  try {
    const res = await paperclipFetch(`/api/companies/${companyId}/skills`);
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{ id: string; slug: string; name: string }>;
    if (!Array.isArray(data)) return [];
    return data.filter((s) => s && typeof s.slug === "string");
  } catch {
    return [];
  }
}

/**
 * Register the 3 gstack skills (officehour, research, brainstorm) in a company's
 * paperclip skill library. Idempotent — skips skills already present by slug.
 */
export async function registerGstackSkills(companyId: string): Promise<void> {
  try {
    const existing = await listCompanySkills(companyId);
    const existingSlugs = new Set(existing.map((s) => s.slug));

    for (const skill of GSTACK_SKILLS) {
      if (existingSlugs.has(skill.slug)) continue;
      const res = await paperclipFetch(`/api/companies/${companyId}/skills`, {
        method: "POST",
        body: JSON.stringify({
          slug: skill.slug,
          name: skill.name,
          description: skill.description,
          markdown: skill.markdown,
        }),
      });
      if (!res.ok) {
        console.error(
          `[Paperclip] registerGstackSkills: failed to register ${skill.slug}:`,
          res.status,
          await res.text().catch(() => "")
        );
      }
    }
  } catch (err) {
    console.error("[Paperclip] registerGstackSkills error:", err);
  }
}

/**
 * Health check: verify Paperclip instance is reachable.
 */
export async function checkPaperclipHealth(): Promise<{
  ok: boolean;
  url: string;
  error?: string;
}> {
  if (!isPaperclipConfigured()) {
    return { ok: false, url: "", error: "Not configured" };
  }

  try {
    const res = await paperclipFetch("/api/health/", {
      method: "GET",
    });

    return {
      ok: res.ok,
      url: PAPERCLIP_API_URL,
      error: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      url: PAPERCLIP_API_URL,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
