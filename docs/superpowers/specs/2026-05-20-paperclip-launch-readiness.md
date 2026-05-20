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
