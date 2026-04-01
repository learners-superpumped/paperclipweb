import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { scheduleDripEmails } from "@/lib/queries";

const OnboardingSchema = z.object({
  email: z.string().email(),
  idea: z.string().min(5).max(200),
  target: z.string().min(2).max(150),
  valueProp: z.string().min(5).max(200),
  competitors: z.string().max(200).optional().default(""),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = OnboardingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, idea, target, valueProp, competitors } = parsed.data;
    const onboardingData = JSON.stringify({ idea, target, valueProp, competitors });

    // Check if user exists
    const existing = await db()
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing[0]) {
      // Update onboarding data for existing user
      await db()
        .update(users)
        .set({
          onboardingData,
          onboardingCompletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing[0].id));
    } else {
      // Pre-create user so onboarding data isn't lost
      const result = await db()
        .insert(users)
        .values({
          email,
          onboardingData,
          onboardingCompletedAt: new Date(),
        })
        .returning();

      // Schedule drip emails
      if (result[0]) {
        await scheduleDripEmails(result[0].id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Onboarding] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
