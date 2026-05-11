import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { companies, tasks, users, creditTransactions } from "@/db/schema";
import { sendEmail } from "@/lib/agentmail";

const Body = z.object({
  companyId: z.string().uuid(),
  title: z.string().min(1).max(120),
  prompt: z.string().min(1).max(4000),
});

function mockResult(title: string, prompt: string): string {
  return `# ${title}\n\n(예시 결과 — paperclip 인스턴스의 직원들이 협업해서 만들어낸 출력)\n\n사용자 요청: ${prompt.slice(0, 200)}\n\n결과는 spec/case 별 직원의 캐릭터에 맞춰 톤이 결정되며, 보통 30~60초 안에 완성됩니다. 실제 인스턴스(출시 모드)에서는 Claude Opus 4.7 + prompt caching 으로 깊이 있는 출력이 나옵니다.`;
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

  if (user.creditsBalance <= 0) {
    return NextResponse.json(
      { error: "credits_zero", message: "잔액이 0 입니다. 충전 후 다시 시도해주세요." },
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

  const result = mockResult(parsed.title, parsed.prompt);

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
      isMock: true,
      finishedAt: new Date(),
    })
    .returning();

  await db()
    .update(users)
    .set({ creditsBalance: sql`${users.creditsBalance} - 1` })
    .where(eq(users.id, user.id));

  await db().insert(creditTransactions).values({
    userId: user.id,
    companyId: company.id,
    amount: -1,
    type: "usage",
    description: `task: ${parsed.title}`,
  });

  // 결과 메일 (best-effort)
  try {
    await sendEmail({
      to: email,
      subject: `[Paperclip] ${company.name} — ${parsed.title} 결과`,
      body: `
        <div style="max-width:560px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:32px 24px;">
          <h2 style="color:#0F172A;font-size:20px;">${parsed.title}</h2>
          <pre style="white-space:pre-wrap;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:16px;font-size:13px;color:#334155;font-family:inherit;">${result.replace(/</g, "&lt;")}</pre>
          <a href="https://usepaperclip.app/i/${company.slug}" style="display:inline-block;background:#4F46E5;color:white;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;">${company.name} 들어가기</a>
        </div>
      `,
    });
  } catch (err) {
    console.error("[tasks] result mail failed", err);
  }

  return NextResponse.json({ ok: true, taskId: task.id });
}
