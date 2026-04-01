import { NextResponse } from "next/server";
import { getPendingDripEmails, markDripSent, markDripSkipped } from "@/lib/queries";
import { sendEmail } from "@/lib/agentmail";
import { getDripEmail } from "@/lib/drip-emails";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const pending = await getPendingDripEmails(50);
    let sent = 0;
    let skipped = 0;

    for (const row of pending) {
      if (row.user.plan !== "free") {
        await markDripSkipped(row.drip.id);
        skipped++;
        continue;
      }

      const onboardingData = row.user.onboardingData
        ? JSON.parse(row.user.onboardingData)
        : { idea: "your business", target: "your customers", valueProp: "", competitors: "" };

      const template = getDripEmail(row.drip.day, onboardingData);
      if (!template) {
        await markDripSkipped(row.drip.id);
        skipped++;
        continue;
      }

      try {
        await sendEmail({
          to: row.user.email,
          subject: template.subject,
          body: template.body,
        });
        await markDripSent(row.drip.id);
        sent++;
      } catch (err) {
        console.error(`[Drip] Failed to send day ${row.drip.day} to ${row.user.email}:`, err);
      }
    }

    return NextResponse.json({ sent, skipped, total: pending.length });
  } catch (error) {
    console.error("[Drip] Cron error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
