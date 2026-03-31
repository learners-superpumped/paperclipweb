import { z } from "zod";

// ─── Configuration ───

const PAPERCLIP_API_URL = process.env.PAPERCLIP_API_URL ?? "";
const PAPERCLIP_API_KEY = process.env.PAPERCLIP_API_KEY ?? "";

/**
 * Whether the Paperclip backend is configured.
 * When false, instance creation works in "demo mode" — records are saved
 * but no real Paperclip company is provisioned.
 */
export function isPaperclipConfigured(): boolean {
  return PAPERCLIP_API_URL.length > 0 && PAPERCLIP_API_KEY.length > 0;
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
    throw new Error("Paperclip is not configured. Set PAPERCLIP_API_URL and PAPERCLIP_API_KEY.");
  }

  const url = `${PAPERCLIP_API_URL.replace(/\/+$/, "")}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PAPERCLIP_API_KEY}`,
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
