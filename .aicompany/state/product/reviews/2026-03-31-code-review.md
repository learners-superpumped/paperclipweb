# 코드 리뷰: 스펙 대조
리뷰일: 2026-03-31
스펙: /Users/nevermind/slaves/paperclipweb/.aicompany/state/product/specs/2026-03-31-paperclipweb.md
가격: /Users/nevermind/slaves/paperclipweb/.aicompany/state/product/pricing/2026-03-31-pricing.md
디자인: /Users/nevermind/slaves/paperclipweb/.aicompany/state/product/design/2026-03-31.md
이벤트 택소노미: /Users/nevermind/slaves/paperclipweb/.aicompany/state/product/design/event-taxonomy.md

---

## Summary: FAIL

**판정 근거:** 스펙 필수 API 2개 누락, GitHub/Google OAuth 미구현, 크레딧 차감 API 미구현.

---

## 스펙 준수 현황
- 구현 완료: 22개 항목
- 누락: 4개 항목 (Critical)
- 오버스펙: 2개 항목 (Warning)

---

## Critical Issues (must fix)

### 1. `/api/proxy/ai` 미구현 — AI 크레딧 차감 없음
스펙 명시: `POST /api/proxy/ai — AI API 프록시 (크레딧 차감)`.
이 엔드포인트가 존재하지 않는다. MVP의 핵심 기능("번들 크레딧으로 에이전트 실행")이 실제로 동작할 수 없다.
`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`가 코드 어디에서도 참조되지 않는다.
크레딧 `type: "usage"` 트랜잭션이 생성되는 코드 경로가 전혀 없다.
**수정:** `src/app/api/proxy/ai/route.ts` 생성. 요청 수신 → 크레딧 잔액 확인 → AI API 호출 → `addCreditTransaction({ type: "usage", amount: -1 })` → `trackServerCreditsUsed()` 순서로 구현.

### 2. GitHub / Google OAuth 프로바이더 미구성
스펙 명시: "GitHub/Google 소셜 로그인" (필수 기능 #5). `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` 환경 변수가 `.env.example`에 있지만 `src/lib/auth.ts`의 `providers` 배열에는 이메일 매직링크 프로바이더만 존재한다. 로그인/회원가입 페이지의 GitHub/Google 버튼은 UI만 있고 실제 OAuth 설정이 없어 런타임에 실패한다.
**수정:** `auth.ts`에 `GitHub({ clientId: process.env.AUTH_GITHUB_ID, clientSecret: process.env.AUTH_GITHUB_SECRET })`, `Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET })` 추가. `next-auth/providers/github`, `next-auth/providers/google` import 포함.

### 3. `/api/companies/:id` (개별 회사 상세/삭제) 동적 라우트 미구현
스펙 명시: `GET /api/companies/:id`, `DELETE /api/companies/:id`, `GET /api/companies/:id/usage`.
현재는 `src/app/api/companies/route.ts` 하나만 있고, DELETE는 쿼리 파라미터(`?id=`) 방식으로 같은 파일에서 처리한다. `/api/companies/:id`와 `/api/companies/:id/usage` 동적 라우트가 없다.
MVP에서 개별 인스턴스 사용량 조회가 불가능하다.
**수정:** `src/app/api/companies/[id]/route.ts` 및 `src/app/api/companies/[id]/usage/route.ts` 생성.

### 4. 크레딧 잔액 음수 방지 로직 없음
`addCreditTransaction()` 함수가 `users.creditsBalance + amount`를 직접 적용하며 잔액이 음수가 되어도 막지 않는다. Free 플랜은 "크레딧 소진 시 차단" 정책이 스펙에 명시되어 있다. `/api/proxy/ai`가 없어서 현재는 실제 차감이 발생하지 않지만, 구현 시 반드시 함께 처리해야 한다.
**수정:** `addCreditTransaction` 또는 `/api/proxy/ai`에서 `creditsBalance >= 1` 확인 후 차단, 그렇지 않으면 `{ error: "Insufficient credits" }` 반환.

---

## Warnings (should fix)

### 5. Settings 페이지 Delete Account — TODO 미완성
`src/app/dashboard/settings/page.tsx:234`에 `// TODO: Call DELETE /api/user` 주석이 있고 실제 API 호출이 없다. 버튼 클릭 시 아무것도 일어나지 않는다. UX 결함. `/api/user` DELETE 핸들러 구현 필요.

### 6. `sendCreditLowEmail()` 함수 호출 경로 없음
`src/lib/agentmail.ts`에 `sendCreditLowEmail()` 함수가 정의되어 있으나 코드 어디에서도 호출되지 않는다. 크레딧 부족 이메일은 스펙 명시 사항이 아니므로 FAIL 사유는 아니지만, 데드 코드다. 제거하거나 실제 트리거를 연결할 것.

---

## Suggestions (nice to have)

### 7. `credit_balances` 테이블 없음 (스펙 vs 구현 불일치 — 기능은 동등)
스펙 DB 스키마는 별도 `credit_balances` 테이블을 명시했으나, 구현은 `users` 테이블의 `credits_balance`, `credits_limit` 컬럼으로 통합했다. 기능적으로 동등하며 실제로 더 단순하다. 오버스펙 제거로 인정 가능하나, 향후 DB 마이그레이션 문서에 설계 결정 사항을 기록할 것.

### 8. `credit_transactions` 스펙 필드 일부 미구현
스펙: `provider`, `model`, `tokens_input`, `tokens_output` 컬럼 명시. 구현된 `credit_transactions` 테이블에는 이 필드들이 없다. `/api/proxy/ai` 구현 시 함께 추가할 것.

### 9. `@tailwindcss/typography` 미사용 가능성
`package.json` devDependencies에 `@tailwindcss/typography`가 있으나 실제 코드에서 `prose` 클래스 사용이 확인되지 않는다. 필요 없으면 제거.

---

## Missing from Spec

| 번호 | 항목 | 스펙 위치 |
|------|------|----------|
| 1 | `POST /api/proxy/ai` — AI API 프록시 + 크레딧 차감 | 스펙 Part 4, API 엔드포인트 목록 |
| 2 | GitHub OAuth 프로바이더 (`next-auth` 설정) | 스펙 Part 3, Part 4 필수 기능 #5 |
| 3 | Google OAuth 프로바이더 (`next-auth` 설정) | 스펙 Part 3, Part 4 필수 기능 #5 |
| 4 | `GET /api/companies/:id/usage` — 사용량 조회 | 스펙 Part 4, API 엔드포인트 목록 |

---

## Over-spec Items

| 번호 | 파일:위치 | 설명 |
|------|----------|------|
| 1 | `src/lib/agentmail.ts:63` | `sendCreditLowEmail()` — 스펙에 없는 기능, 호출 경로 없음 → 제거 권고 |
| 2 | `src/app/api/dashboard/route.ts` | 스펙에 `/api/dashboard` 엔드포인트 없음 (내부 편의 API). 제거 대신 `/api/companies`와 `/api/credits/balance` 직접 호출로 통합 가능. 현재는 허용 가능 수준. |

---

## 중복/불필요

| 파일:위치 | 이유 |
|----------|------|
| `src/app/dashboard/settings/page.tsx:234` | `// TODO: Call DELETE /api/user` — 미완성 코드 |
| `src/lib/auth.ts` 전체 | GitHub/Google 프로바이더 설정 없이 UI에서 사용하는 구조적 불일치 |

---

## 빌드
- **빌드 성공** (0 errors, 0 warnings)
- 라우트: 17개 (static 8 + dynamic 9)
- First Load JS shared: 102 kB
- 미들웨어: 88.3 kB (`/dashboard/:path*` 보호)

---

## Codex 결과
설치됨. `codex review` 실행 결과: `Error: Specify --uncommitted, --base, --commit, or provide custom review instructions` — git 리포지토리로 초기화되지 않아 실행 불가. 건너뜀.

---

## 스펙 준수 체크리스트

### 필수 페이지
- [x] 랜딩 페이지 (/)
- [x] 로그인 (/login)
- [x] 회원가입 (/signup)
- [x] 대시보드 (/dashboard)
- [x] 인스턴스 (/dashboard/instances)
- [x] 빌링 (/dashboard/billing)
- [x] 설정 (/dashboard/settings)

### 가격 모델
- [x] Free: $0 / 100 크레딧 / 1 회사
- [x] Starter: $19 / 1,000 크레딧 / 3 회사 / $0.03 초과
- [x] Pro: $49 / 3,000 크레딧 / 10 회사 / $0.025 초과
- [x] 탑업: Small $12.5/500cr, Medium $40/2000cr, Large $87.5/5000cr

### 인증
- [x] 이메일 매직링크 (AgentMail 연동)
- [ ] GitHub OAuth — UI만 있고 NextAuth 프로바이더 미설정
- [ ] Google OAuth — UI만 있고 NextAuth 프로바이더 미설정

### Stripe
- [x] Checkout 세션 생성 (구독 + 탑업)
- [x] Customer Portal
- [x] Webhook 수신 (`checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`)
- [x] Webhook 서명 검증
- [x] Slack 결제 알림

### DB 스키마
- [x] users (plan, credits_balance, credits_limit 통합)
- [x] subscriptions
- [x] companies
- [x] credit_transactions
- [x] invoices (추가 구현)
- [ ] credit_transactions에 provider/model/tokens 필드 없음

### Amplitude
- [x] 클라이언트 SDK 초기화 (`analytics-provider.tsx`)
- [x] `page_view`, `session_start` 자동 추적
- [x] `signup_started`, `signup_completed`, `login`
- [x] `instance_created`, `first_instance_created`, `instance_deleted`
- [x] `checkout_started`, `checkout_completed` (서버사이드)
- [x] `credits_topped_up`, `subscription_cancel` (서버사이드)
- [x] `billing_viewed`, `pricing_view`, `dashboard_viewed`, `settings_updated`
- [x] 서버사이드 Amplitude HTTP API (`analytics-server.ts`)
- [ ] `credits_used` — `/api/proxy/ai` 없어 실제 발화 불가

### AgentMail
- [x] 매직링크 이메일
- [x] 웰컴 이메일 (신규 유저 생성 시)

### 미들웨어 (Auth 보호)
- [x] `/dashboard/:path*` — NextAuth JWT 기반 보호

### 인스턴스 관리
- [x] 인스턴스 생성 (플랜 한도 확인 포함)
- [x] 인스턴스 목록 조회
- [x] 인스턴스 삭제
- [ ] AI 프록시 + 크레딧 차감 없음
- [ ] 크레딧 잔액 음수 방지 없음

---

## 판정
**FAIL** — 누락 4개

누락 항목이 수정되면 즉시 PASS 전환 가능. 빌드는 정상이며 코드 품질 전반은 양호하다.
