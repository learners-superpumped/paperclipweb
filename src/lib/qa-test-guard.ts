import { NextResponse } from "next/server";
import { headers as nextHeaders } from "next/headers";

// QA test endpoint 공통 가드.
// mode flag (STRIPE_TEST_MODE 또는 PAPERCLIP_PAYMENT_MOCK) 둘 다 꺼져 있으면 prod live —
// 임의 유저 credits 변경·구독 취소 같은 endpoint 는 노출 자체 차단 (404, 존재 숨김).
// mode flag 가 켜져 있어도 CRON_SECRET bearer token 으로 한 번 더 게이트.
export async function guardQaTestRoute(): Promise<NextResponse | null> {
  const isTestMode = process.env.STRIPE_TEST_MODE === "true";
  const isMockMode = process.env.PAPERCLIP_PAYMENT_MOCK === "true";
  if (!isTestMode && !isMockMode) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const auth = (await nextHeaders()).get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return null;
}
