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
