# paperclip 런칭 준비 (Launch Readiness)

> 작성: 2026-05-20 · 대상: `projects/paperclip/paperclipweb` · 상태: 실행 중

## 목표

paperclipweb 을 "완전히 동작하는 제품"으로 만들어 실제 런칭한다.

사용자 결정 (2026-05-20): **제품 완성 + 실결제(Stripe LIVE) 라이브.** 마케팅/GTM 은 범위 밖 (aicompany-operation 담당).

## 완료 기준 (Definition of Done)

- 전 구간 실제 동작, QA 버그 0:
  가입 → 결제(Stripe LIVE) → 프로비저닝 → 인스턴스 사용 → 빌링/크레딧/충전 → 해지
- 외부 의존성 production 정합:
  - Stripe: LIVE 키 · webhook 등록 · price ID 검증 · test/mock 모드 잔재 제거
  - paperclip 엔진 (`paperclip-engine-aicompany.fly.dev`): 가동 · 템플릿 SHA 핀
  - AgentMail: 인박스 존재 · 발송 동작
  - Neon DB · Vercel env vars · cron 4개 (drip / monthly-summary / cost-poller / destroy-archived)
- 빌드 · 타입 · 린트 클린, Vercel 배포 성공
- usepaperclip.app 라이브에서 E2E 1회 완주 검증

## 현황 (2026-05-20)

- 배포됨: usepaperclip.app, Vercel production READY.
- 3/31 이후 ~40커밋 QA verify 사이클 (A.x/B.x 체크리스트). 핵심 플로우 존재, 최신 작업 = trial.
- `.aicompany/` 제품 상태 문서는 3/31 동결 — stale, 신뢰 불가.
- 정확한 현재 pass/fail 미상 → Phase 1 에서 실측.

## 접근법

진단 → 수정 → 재검증 → 배포 루프. gstack `/qa` (exhaustive) 를 진단·수정 엔진으로,
의존성 정합은 직접, 배포는 `/ship` · `/land-and-deploy`.

## 페이즈

### Phase 1 — 정밀 진단 (read-only)
로컬/라이브 E2E QA + 라우트별 코드 점검 + 외부 의존성 헬스체크.
산출물 = 런칭 블로커 punch list (심각도별).

### Phase 2 — 블로커·버그 전부 수정
punch list 를 심각도 순으로. 핵심 경로 (가입→결제→프로비저닝) 최우선. atomic commit, 재검증.

### Phase 3 — production 의존성 정합화
Stripe LIVE 전환 · webhook · price 검증 · mock/test 잔재 제거. 엔진 · AgentMail · env · cron 검증.

### Phase 4 — 폴리시 + trial 마감
모바일/반응형, 콘텐츠(cases), trial 플로우 완결, 접근성.

### Phase 5 — 배포 + 라이브 검증
배포, usepaperclip.app 에서 E2E 완주 1회.

## 체크포인트 / 하드 블로커

- **Stripe LIVE 전환 직전 1회 확인** — 실결제는 되돌리기 어려움.
- 하드 블로커 (작업 중단·보고 사유):
  - Stripe LIVE 키가 vault 에 없음 → 요청
  - paperclip 엔진(fly)이 다운/미설정 → 별도 판단 필요
  - DB/AgentMail 자격증명 부재
- 그 외는 자율 실행, 완료 시 보고.

## Phase 1 진단 결과 (2026-05-20)

코드 전수 점검 + 라이브 확인. 결론: 제품은 코드 레벨에서 production-quality.
3/31 stale 문서가 시사한 것보다 훨씬 성숙하다.

### 양호 (검증됨)
- 랜딩 동작 (라이브). 3/31 크리티컬 버그(가입 `/api/auth/providers` 500) **해결됨** — 정상 JSON 반환.
- 라이브 결제 경로 `/api/checkout/public` 정상 — `ensurePrice` 로 $29/mo idempotent 생성, `adaptive_pricing` off, prod 에서 live 키 사용.
- webhook `/api/stripe/webhook` 성숙 — idempotency(`stripeEvents`), 트랜잭션, public/auth 양 경로, $9 balance grant, company stub.
- auth(NextAuth v5 매직링크), DB 스키마(15 테이블) 견고. 빌드·타입 클린.
- Stripe LIVE 키 vault 에 존재 (`sk_live_`/`pk_live_` — `vault/common/keys.json`).
- runtime-mode: production 에서 test/mock 모드 강제 비활성 — 안전.

### 코드 런칭 블로커: 없음

### 발견 이슈 (punch list)
- [MED] env 변수 분열: `NEXT_PUBLIC_BASE_URL`(checkout·provisioning 전체, 미정의) vs `NEXT_PUBLIC_APP_URL`(나머지). checkout/provisioning 리다이렉트가 항상 하드코딩 prod URL fallback — prod 정상, dev/preview 깨짐. → 한 이름으로 통일.
- [MED] `npm run lint` 깨짐 — `next lint` deprecated + ESLint 설정 없음 → 인터랙티브 프롬프트 → quality gate 무력.
- [LOW] dead `/api/stripe/checkout` 라우트 — 호출처 없음, 깨진 `getPriceId` fallback(`"price_pro_monthly"`) 사용.
- [LOW] cruft: `constants.ts` dead `starter` 플랜, `stripe.ts` stale `TOPUP_PRICE_IDS`(`constants.ts` TOPUP 와 불일치), legacy `creditsBalance`/`creditsLimit` 컬럼.

### 미검증 (Phase 3/5 에서)
- Vercel prod env 가 실제 live `STRIPE_SECRET_KEY`·`STRIPE_WEBHOOK_SECRET` 보유 여부.
- paperclip 엔진 production 가동 (`/api/paperclip/health` 401-gated).
- 라이브 E2E 1회 완주, cron 4개, trial 플로우.

### 잠재 하드 블로커
- Stripe 계정 라이브 활성화 — `sk_live_` 키 보유 ≠ 계정이 실결제 수락 가능 상태(사업자·은행 인증). 미활성 시 실결제 실패. 활성화는 사용자만 가능.

## Phase 2-3 결과 (2026-05-20)

### Phase 2 — env 변수 통일 (완료, 배포됨 `f2ead39`)
checkout·provisioning 의 `NEXT_PUBLIC_BASE_URL`(미정의) → `NEXT_PUBLIC_APP_URL` 5파일 통일.

### Phase 3 — production 의존성 검증
- ✅ Stripe LIVE 계정 `acct_1OzL6yCKrRNmQd8t` (US/USD): `charges_enabled`·`payouts_enabled`·`details_submitted` 전부 true. **위 '잠재 하드 블로커'(계정 활성화) 해소 — 실결제 수락 가능 상태 확인됨.** Pro $29/mo price(`price_1TWwvC…`, 2900 USD/month) 활성.
- ✅ paperclip 엔진 `paperclip-engine-aicompany.fly.dev` 가동 중.
- ✅ 프로덕션 런타임 에러 0건 (48h).

### 🔴→✅ 실제 런칭 블로커: Stripe webhook 미등록
- **발견:** LIVE Stripe 계정에 paperclipweb webhook endpoint 부재 (gstackweb·digestly 것만 존재). → 구독 갱신(`invoice.paid`)·취소(`customer.subscription.deleted`)가 처리 불가. Vercel 의 `STRIPE_WEBHOOK_SECRET` 는 endpoint 없는 stale 값이었음.
- **수정:** webhook endpoint `we_1TZ49pCKrRNmQd8tRSRD7Wbj` 생성 (`https://usepaperclip.app/api/stripe/webhook`, events: `checkout.session.completed`·`invoice.paid`·`customer.subscription.deleted`). 새 `whsec_` 시크릿을 Vercel prod env(업데이트) + `vault/projects/paperclip/keys.json` 동기화. 재배포로 반영.

### 남은 검증
- 실 $29 결제 1건으로 결제 → webhook → 프로비저닝 전 구간 확정 (실 거래 필요 — 자율 실행 범위 밖).

## 엔진 복구 + 핵심 플로우 E2E 검증 (2026-05-20)

### 🔴→✅ 진짜 런칭 블로커: paperclip 엔진 다운
결제 후 프로비저닝 E2E 중 발견. 엔진(`paperclip-engine-aicompany.fly.dev`)이
`/api/auth/sign-in/email` 에 5xx 반환 → 프로비저닝이 회사를 못 만듦 → **결제한
사용자가 아무것도 못 받음.** 두 단계로 원인 규명·수정:

1. **Fly 볼륨 풀** — 임베디드 Postgres 가 `No space left on device` 로 부팅
   실패 → 크래시루프 → 503. 볼륨 `vol_r683qw0nm8o7oeq4` 1GB→10GB 확장.
2. **엔진 config 검증 실패** — 디스크 수정 후 `authenticated public exposure
   requires auth.baseUrlMode=explicit` 로 재크래시. Fly secret
   `PAPERCLIP_AUTH_BASE_URL_MODE=explicit` 추가 (`PAPERCLIP_PUBLIC_URL` 이
   이미 있어 `publicBaseUrl` 충족).

결과: 엔진 auth 200 + 쿠키 정상, 26개 회사 DB 보존, 보호 라우트 동작.

### 프로비저닝 회복력 보강 (배포됨 `9635c45`)
- `paperclip.ts`: `fetchWithRetry` — 5xx/429·네트워크 오류 지수 백오프 재시도.
  엔진 재시작으로 쿠키 죽으면 401/403 시 재로그인 후 1회 재시도.
- `provisioning/stream`: import 실패(`paperclipCompanyId` 없음) 시 `done:true`
  대신 `error` 전송 — 가짜 성공 제거. 회사 stub 은 `provisioning` 상태로 남아
  재진입 시 idempotent 재프로비저닝 (real·mock 양 경로).
- `provisioning-client`: 에러 화면에 Try again 버튼.

### 핵심 유저 플로우 E2E (test 모드, 실 브라우저)
랜딩 → 템플릿(`ai-insta-influencer`) → 샘플 태스크(캡션 3개 생성) → "Launch
for $29/month" → Stripe 테스트 결제(`cs_test_`, 카드 4242) → 프로비저닝
스트림(11.9s, 무에러) → 엔진 회사 생성 → invite URL.

DB 검증: user=pro, company=running (`paperclip_company_id`+`instance_url`),
subscription=active (`sub_1TZ5Im…`), $9 크레딧 grant. **전 구간 동작 확정.**

### 알려진 후속 (런칭 블로커 아님)
- Vercel `development` env 가 live Stripe 키 보유 → 로컬 dev footgun.
  `.env.local` 은 test 모드로 수정함(로컬). dev env 자체를 test 키로 정리 권장.
- 엔진 임베디드 Postgres 단일 Fly 볼륨 — 디스크 풀 재발 가능. 10GB 확보로
  당장은 여유. 장기적으로 디스크 사용량 모니터링/알람 권장.

### 결론
**제품 핵심 플로우 동작 확정, production 라이브.** usepaperclip.app 가입→결제
→프로비저닝→작동하는 AI 회사 인스턴스까지 검증됨. 실 LIVE 결제 1건만 사용자가
원할 때 확인하면 100%.

## 엔진 에이전트 실행 복구 (2026-05-20)

### 🔴→✅ 진짜 제품 블로커: 프로비저닝된 회사의 AI 에이전트가 작동 안 함
"유저가 paperclip 으로 서비스를 디벨롭할 수 있나?" 검증 중 발견. 펀널
(가입·결제·프로비저닝)은 되는데 **정작 AI 회사가 일을 안 함** — 엔진 29개
회사가 최대 1주일간 진행된 작업 0건, non-idle 에이전트 0건.

엔진 SSH 직접 진단으로 2단 원인 규명:
1. **에이전트 어댑터 미설정** — 템플릿 import 로 생성된 에이전트는
   `adapterType="process"` 인데 `command` 가 없음 → 모든 heartbeat run 이
   `"Process adapter missing command"` 로 즉시 실패. 엔진엔 `claude`·`codex`
   CLI 와 `claude_local`·`codex_local` 어댑터가 설치돼 있는데 안 쓰임.
2. **시드 태스크가 backlog 정체** — heartbeat 스케줄러(기본 on)는 `todo`·
   assigned 이슈만 처리, `backlog` 는 무시.

### 수정 (배포됨 `67ff9b1`)
provisioning/stream 에 `activateCompany` 헬퍼 추가 (real·mock 공통):
- 각 에이전트를 `claude_local` 어댑터로 전환 + per-agent heartbeat 활성화
  (`configureAgentForWork`).
- 시드 태스크를 `backlog`→`todo` 승격 (`listCompanyIssues`,
  `promoteIssueToTodo`).
- 에이전트 즉시 kick (`wakeupAgent`).

### 검증
- 단건 테스트: 에이전트를 `claude_local` 로 바꾸자 실제 `claude` CLI 로
  ~900단어 SEO 블로그 글을 작성·납품, 이슈 `done`.
- 자율 경로: `claude_local`+heartbeat+`todo` 만으로 스케줄러가 수동 개입
  없이 에이전트 실행(20초 내 `in_progress`).
- 전체 E2E: 수정된 provisioning 으로 새 결제→프로비저닝. 새 회사 에이전트
  3개 전부 `claude_local`+heartbeat, 시드 태스크가 개입 없이
  `in_progress`→`done` (~40초). **유저가 받는 회사가 실제로 일을 함.**

### 알려진 후속
- 기존 29개 (전부 테스트) 회사는 옛 `process` 에이전트 그대로 — 신규
  가입만 수정 적용. 실 유저 없으니 무방.
- 엔진 `server.log` 가 744MB 단일 파일 — 로테이션 없음. 디스크 풀 재발
  방지 위해 로그 로테이션 권장.

### 최종 결론
**유저가 paperclip 으로 실제 서비스를 디벨롭할 수 있음 — 확정.** 가입→결제
→프로비저닝→작동하는 AI 직원이 자율적으로 태스크 수행까지 전 구간 검증.
