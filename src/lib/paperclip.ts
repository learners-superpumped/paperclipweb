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
  });

  if (!res.ok) {
    console.error("[Paperclip] Session auth failed:", res.status);
    return null;
  }

  // Strategy 1: named session cookies (better-auth convention)
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const namedCookie = setCookie
    .map((c) => c.split(";")[0])
    .filter((c) => c.startsWith("better-auth") || c.startsWith("paperclip") || c.startsWith("session"))
    .join("; ");
  if (namedCookie) {
    cachedSessionCookie = namedCookie;
    sessionExpiresAt = Date.now() + 55 * 60 * 1000;
    return namedCookie;
  }

  // Strategy 2: all cookies as fallback (some versions)
  const allCookies = setCookie.map((c) => c.split(";")[0]).join("; ");
  if (allCookies) {
    cachedSessionCookie = allCookies;
    sessionExpiresAt = Date.now() + 55 * 60 * 1000;
    return allCookies;
  }

  // Strategy 3: extract Bearer token from JSON body (better-auth v1+ may return token in body)
  try {
    const body = await res.clone().json() as Record<string, unknown>;
    const token =
      (body?.token as string | undefined) ??
      ((body?.session as Record<string, unknown> | undefined)?.token as string | undefined) ??
      ((body?.data as Record<string, unknown> | undefined)?.token as string | undefined);
    if (token) {
      // Store with prefix so paperclipFetch uses Authorization header
      cachedSessionCookie = `__bearer__${token}`;
      sessionExpiresAt = Date.now() + 55 * 60 * 1000;
      return cachedSessionCookie;
    }
  } catch {
    // JSON parse failure — no body token
  }

  console.error("[Paperclip] Could not extract session from auth response (no cookies, no body token)");
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
      if (cookie.startsWith("__bearer__")) {
        headers.Authorization = `Bearer ${cookie.slice(10)}`;
      } else {
        headers.Cookie = cookie;
      }
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
  humanRole: "ceo" | "admin" | "member" = "ceo",
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
    const res = await paperclipFetch("/api/companies", {
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
