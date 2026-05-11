import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { findCase } from "@/lib/cases";
import { MockCheckoutForm } from "@/components/checkout/mock-checkout-form";
import { PLANS, TOPUP } from "@/lib/constants";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ case?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const { case: caseId } = await searchParams;
  const template = caseId ? findCase(caseId) : undefined;

  return (
    <div className="min-h-screen bg-secondary-50/40 py-12 px-4">
      <div className="mx-auto max-w-xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-secondary-800">
            결제하고 진짜 회사 시작
          </h1>
          <p className="mt-2 text-sm text-secondary-700">
            mock 에서 만드신 게 결제 직후 진짜 인스턴스로 그대로 옮겨갑니다.
          </p>
        </div>

        <div
          className="rounded-2xl border border-secondary-200 bg-white p-6 mb-6"
          data-testid="order-summary"
        >
          <h2 className="text-sm font-semibold text-secondary-800 mb-3">
            주문 요약
          </h2>
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-secondary-800 font-medium">
                Pro 구독 (월 결제)
              </div>
              <div className="text-xs text-secondary-700">
                {PLANS.pro.credits} 액션 + 인스턴스 1개 + 이메일 알림
              </div>
            </div>
            <div className="text-2xl font-bold text-secondary-800">
              ${PLANS.pro.price}
              <span className="text-sm text-secondary-700 font-normal">/월</span>
            </div>
          </div>
          {template && (
            <div className="mt-4 rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm text-secondary-700">
              <span className="text-xs text-primary/80 font-medium mr-2">
                이관 대상
              </span>
              {template.emoji} {template.company} (mock 에서 만든 회사 그대로
              진짜 인스턴스로)
            </div>
          )}
          <div className="mt-3 text-xs text-secondary-600">
            잔액 부족 시 ${TOPUP.price} 로 {TOPUP.credits} 액션 충전 가능 (가입
            후 dashboard 에서).
          </div>
        </div>

        <MockCheckoutForm caseId={caseId ?? null} />
      </div>
    </div>
  );
}
