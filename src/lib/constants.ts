// paperclip 가격 정책 — spec.md ## 6 가격정책 SoT.
// 단일 구독 (Pro $29 / mo, 100 크레딧, 인스턴스 1) + 단일 탑업 ($10 / 50 크레딧).
// 옛 Free/Starter/Pro 3-tier 와 small/medium/large 탑업은 폐기.
// 단, dashboard/billing 등 옛 코드가 PLANS.free / PLANS.starter / TOPUP_PACKAGES 참조 → Phase 6~7 에서 갈아엎기 전까지 안전한 fallback 만 유지 (실제 사용자에 노출되는 곳은 없음, 빌드 통과용).

export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    credits: 0,
    companies: 0,
    features: [] as readonly string[],
    cta: "Sign up",
    popular: false,
  },
  starter: {
    name: "Starter",
    price: 0,
    credits: 0,
    companies: 0,
    features: [] as readonly string[],
    cta: "Sign up",
    popular: false,
  },
  pro: {
    name: "Pro",
    price: 29,
    credits: 100,
    companies: 1,
    features: [
      "Paperclip 인스턴스 1개",
      "AI 액션 100회/월 (Claude Opus 4.7)",
      "잔액·이메일 알림 자동",
      "사용자 도메인 (<slug>.usepaperclip.app)",
    ] as readonly string[],
    cta: "$29 로 시작",
    popular: true,
  },
} as const;

export const TOPUP = {
  name: "탑업",
  credits: 50,
  price: 10,
  description: "$10 결제 = 50 액션 즉시 충전",
} as const;

// 옛 billing 페이지 backward-compat (Phase 6~7 에서 dashboard/billing 갈아엎으면 제거).
export const TOPUP_PACKAGES = [
  { name: "Topup", credits: TOPUP.credits, price: TOPUP.price },
] as const;

export const NAV_ITEMS = [
  { href: "/dashboard", label: "내 회사" },
  { href: "/dashboard/billing", label: "결제" },
  { href: "/dashboard/settings", label: "설정" },
] as const;
