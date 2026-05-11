import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { signupIntents } from "@/db/schema";
import { findCase } from "@/lib/cases";

const Body = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(80),
  caseId: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const caseId = parsed.caseId && findCase(parsed.caseId) ? parsed.caseId : null;

  await db()
    .insert(signupIntents)
    .values({
      email: parsed.email.toLowerCase(),
      name: parsed.name.trim(),
      caseId,
    })
    .onConflictDoUpdate({
      target: signupIntents.email,
      set: {
        name: parsed.name.trim(),
        caseId,
        consumedAt: null,
        createdAt: new Date(),
      },
    });

  return NextResponse.json({ ok: true });
}
