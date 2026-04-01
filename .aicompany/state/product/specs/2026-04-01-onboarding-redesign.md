# User Story: Paperclip 온보딩 리디자인

**Version:** 1.0
**Date:** 2026-04-01
**Status:** Draft — 유저 스토리 기획 (개발 전)

---

## 핵심 전략 변경

**AS-IS:** 랜딩 → 가입 → 대시보드 → 인스턴스 생성 → 사용 → 결제
**TO-BE:** 랜딩(소셜프루프) → 사업아이디어 입력 → 온보딩 질문 → 로딩(회사 세팅 연출) → 이메일 캡처 → 매직링크 로그인 → 결제 → (결제 후) 실제 서버 세팅

**전략 의도:** 결제 전에 "이미 회사가 만들어졌다"는 경험을 선제공. 가입 장벽을 사업아이디어 입력까지 낮추고, 감정적 몰입 후 결제로 전환.

---

## 온보딩 퍼널

```
[Google 검색 유입]
    ↓
[1] 랜딩 페이지 — 소셜프루프 (공신력)
    │  GitHub Stars 실시간 카운터 + 증가 그래프
    │  Twitter/X 멘션 피드 (실제 트윗 임베드)
    │  "N개 회사가 Paperclip으로 운영 중"
    │  CTA: "내 AI 회사 만들기"
    ↓
[2] 사업 아이디어 입력 — 첫 질문
    │  "어떤 사업을 시작하고 싶으세요?"
    │  텍스트 입력 (자유형, 1줄)
    │  예시 플레이스홀더: "AI로 부동산 리드를 자동 발굴하는 서비스"
    ↓
[3] 온보딩 질문 플로우 — 단계별 (3-4개 질문)
    │  Q1: "누구를 위한 서비스인가요?" (타겟 고객)
    │  Q2: "이 서비스로 고객이 얻는 핵심 가치는?" (가치 제안)
    │  Q3: "경쟁사나 대안이 있나요?" (선택, 스킵 가능)
    │  Q4: "월 예산은 어느 정도인가요?" (가격 감도 — 플랜 추천용)
    │  각 질문은 1페이지 1질문, 진행바 표시
    ↓
[4] 확인 페이지 — 요약 + 시작 버튼
    │  입력한 정보 요약 카드
    │  "이 정보로 AI 회사를 세팅합니다"
    │  CTA: "회사 만들기" (큰 버튼)
    ↓
[5] 로딩 연출 페이지 — 감정적 몰입
    │  빙글빙글 로딩 애니메이션
    │  단계별 진행 메시지 (2-3초 간격):
    │    ✓ "회사가 세팅되었습니다"
    │    ✓ "CEO 에이전트가 일할 준비를 시작했습니다"
    │    ✓ "시장 조사를 시작합니다..."
    │    ✓ "경쟁사를 분석하고 있습니다..."
    │    ✓ "첫 번째 일감을 준비하고 있습니다..."
    │    ✓ "세팅이 완료되었습니다!"
    │  (실제 서버 작업 없음 — 순수 프론트엔드 연출)
    ↓
[6] 이메일 캡처 — 로그인 겸 리드 캡처
    │  "첫 결과를 확인할 이메일을 입력해주세요"
    │  이메일 입력 → "매직링크 전송" 버튼
    │  매직링크 발송 (AgentMail)
    │  → 유저 DB 생성 (plan: free, 온보딩 데이터 저장)
    ↓
[7] 매직링크 인증 → 결제 페이지 리다이렉트
    │  매직링크 클릭 시 → 바로 /pricing 으로 이동
    │  (대시보드가 아닌 결제 페이지가 첫 화면)
    │  "AI 회사가 준비되었습니다. 플랜을 선택하세요."
    │  Free / Starter / Pro 플랜 표시
    │  Stripe Checkout 연동
    ↓
[8-A] 결제 완료 → 실제 서버 세팅
    │  Stripe webhook → 실제 Paperclip 인스턴스 프로비저닝
    │  온보딩 데이터(아이디어, 타겟, 가치제안) → 인스턴스에 전달
    │  → 대시보드로 이동 (실제 회사가 돌아가는 상태)
    │
[8-B] 결제 안 함 → 이메일 드립 캠페인 (3일)
    │  Day 0: "회사 세팅이 완료되었습니다" (가입 직후)
    │  Day 1: "CEO 에이전트가 시장 조사를 완료했습니다. 결과를 확인하세요"
    │  Day 2: "첫 번째 리드를 발견했습니다. 지금 확인하세요"
    │  Day 3: "3일간의 작업 리포트가 준비되었습니다"
    │  → 모든 이메일의 CTA 링크 → /pricing (결제 페이지)
    │  → 실제 서버에서는 아무 작업도 안 함
    │  → 결제 시에만 실제 인스턴스 생성
```

---

## 유저 스토리

### 퍼널 1: 랜딩 — "보는 것" (인지 + 신뢰)

---

#### US-1.1: 소셜프루프 랜딩 페이지

**As a** Google 검색으로 유입된 방문자
**I want to** Paperclip이 얼마나 많은 사람들이 쓰고 있고 신뢰받는지 한눈에 확인하고 싶다
**So that** 이 서비스를 믿고 써도 되겠다는 확신이 생긴다

**보는 것:**
- Hero 섹션: "AI 회사, 바로 시작" + 서브카피
- GitHub Stars 실시간 카운터 (예: ★ 12,847) + 최근 30일 증가 그래프 (미니 차트)
- Twitter/X 멘션 캐러셀 — 실제 트윗 3-5개 순환 (개발자/창업자 트윗)
- "N개 AI 회사가 Paperclip으로 운영 중" 카운터
- 신뢰 배지: "Open Source", "YC-backed" (해당 시), GitHub Contributors 수

**느끼는 것:**
- "오, 이미 많은 사람이 쓰고 있네"
- "오픈소스고 GitHub에서 활발하니 믿을 만하다"
- "나도 해봐야겠다"

**하는 것:**
- CTA 클릭: "내 AI 회사 만들기" → 온보딩 시작 (/onboarding)

**수용 기준:**
- [ ] GitHub API로 실시간 star count 표시 (SSR, 1시간 캐시)
- [ ] 최근 30일 star 증가 추이 미니 차트 (sparkline)
- [ ] Twitter/X 멘션 3-5개 정적 또는 API 기반 캐러셀
- [ ] 운영 중 회사 수 카운터 (DB 기반 또는 하드코딩)
- [ ] 모바일 반응형
- [ ] SEO: meta title/description, OG 태그, 구조화 데이터 (Organization, SoftwareApplication)
- [ ] CTA 클릭 시 `cta_click(location: "hero", destination: "onboarding")` Amplitude 이벤트

---

#### US-1.2: SEO 최적화 랜딩

**As a** "paperclip hosting" "AI agent hosting" 등을 검색하는 잠재 고객
**I want to** Google 검색 결과에서 paperclipweb을 발견하고 싶다
**So that** 자연 유입으로 서비스를 알게 된다

**수용 기준:**
- [ ] 타겟 키워드: "paperclip hosting", "AI agent hosting", "managed paperclip", "paperclip cloud alternative"
- [ ] meta title: "Paperclip Hosting — One Bill, One Click, Your AI Company"
- [ ] meta description: 160자 이내, 핵심 가치 포함
- [ ] OG image: 브랜드 컬러 + 태그라인 + GitHub stars 수
- [ ] JSON-LD 구조화 데이터 (SoftwareApplication)
- [ ] sitemap.xml, robots.txt
- [ ] 페이지 속도: LCP < 2.5s, CLS < 0.1

---

### 퍼널 2: 온보딩 질문 — "느끼는 것" (몰입)

---

#### US-2.1: 사업 아이디어 입력

**As a** CTA를 클릭한 방문자
**I want to** 내 사업 아이디어를 한 줄로 입력하고 싶다
**So that** Paperclip이 내 사업에 맞게 세팅될 것이라고 기대한다

**보는 것:**
- 클린한 전체화면 — 질문 하나만 중앙에
- "어떤 사업을 시작하고 싶으세요?"
- 텍스트 인풋 (큰 사이즈, 플레이스홀더: "예: AI로 부동산 리드를 자동 발굴하는 서비스")
- 진행바: 1/5
- "다음" 버튼

**느끼는 것:**
- "오, 내 사업에 맞춰주는구나"
- "질문이 간단하네, 해볼까"

**하는 것:**
- 아이디어 텍스트 입력 → "다음" 클릭

**수용 기준:**
- [ ] `/onboarding` 라우트, step 1
- [ ] 텍스트 input (최소 5자, 최대 200자)
- [ ] 로컬 state에 저장 (아직 서버 전송 X)
- [ ] Enter 키로도 다음 진행
- [ ] 뒤로가기 시 입력값 유지
- [ ] `onboarding_started` Amplitude 이벤트 (페이지 진입 시)
- [ ] `onboarding_step_completed(step: 1, field: "idea")` 이벤트

---

#### US-2.2: 타겟 고객 질문

**As a** 아이디어를 입력한 방문자
**I want to** 누구를 위한 서비스인지 답하고 싶다
**So that** AI가 더 정확하게 내 사업을 이해한다

**보는 것:**
- "누구를 위한 서비스인가요?"
- 텍스트 인풋 (플레이스홀더: "예: 소규모 부동산 중개사무소")
- 진행바: 2/5

**수용 기준:**
- [ ] step 2
- [ ] 텍스트 input (최소 2자, 최대 150자)
- [ ] `onboarding_step_completed(step: 2, field: "target")` 이벤트

---

#### US-2.3: 핵심 가치 질문

**As a** 타겟을 입력한 방문자
**I want to** 고객이 얻는 핵심 가치를 답하고 싶다
**So that** AI가 내 서비스의 핵심을 파악한다

**보는 것:**
- "이 서비스로 고객이 얻는 핵심 가치는 무엇인가요?"
- 텍스트 인풋 (플레이스홀더: "예: 수작업 리드 발굴 시간을 90% 줄여줌")
- 진행바: 3/5

**수용 기준:**
- [ ] step 3
- [ ] 텍스트 input (최소 5자, 최대 200자)
- [ ] `onboarding_step_completed(step: 3, field: "value_prop")` 이벤트

---

#### US-2.4: 경쟁사 질문 (선택)

**As a** 가치를 입력한 방문자
**I want to** 경쟁사를 알려주거나 스킵하고 싶다
**So that** 추가 정보를 줄 수도 있지만 강제되지 않는다

**보는 것:**
- "경쟁사나 대안이 있나요? (선택)"
- 텍스트 인풋 + "스킵" 링크
- 진행바: 4/5

**수용 기준:**
- [ ] step 4
- [ ] 선택 입력 — 빈값 허용, "스킵" 클릭 시 다음으로
- [ ] `onboarding_step_completed(step: 4, field: "competitors", skipped: true/false)` 이벤트

---

#### US-2.5: 확인 페이지

**As a** 모든 질문에 답한 방문자
**I want to** 내가 입력한 정보를 확인하고 "회사 만들기"를 누르고 싶다
**So that** 최종 확인 후 진행한다

**보는 것:**
- 입력 정보 요약 카드:
  - 사업 아이디어: "..."
  - 타겟 고객: "..."
  - 핵심 가치: "..."
  - 경쟁사: "..." (또는 "미입력")
- "이 정보로 AI 회사를 세팅합니다"
- CTA: "회사 만들기" (강조 버튼)
- "수정하기" 링크 (이전 단계로)
- 진행바: 5/5

**수용 기준:**
- [ ] step 5 (확인 페이지)
- [ ] 각 항목 옆 "수정" 버튼 → 해당 step으로 이동
- [ ] "회사 만들기" 클릭 시 → 로딩 페이지로 전환
- [ ] `onboarding_confirmed` Amplitude 이벤트

---

### 퍼널 3: 로딩 연출 — "느끼는 것" (기대감 극대화)

---

#### US-3.1: 회사 세팅 로딩 애니메이션

**As a** "회사 만들기"를 누른 방문자
**I want to** AI가 내 회사를 세팅하는 과정을 실시간으로 보고 싶다
**So that** "와, 진짜 회사가 만들어지고 있네"라는 흥분을 느낀다

**보는 것:**
- 전체화면 다크 배경 (몰입감)
- 중앙에 로딩 스피너 (또는 Paperclip 아이콘 회전)
- 아래에 진행 메시지가 순차적으로 나타남 (타이핑 효과):
  1. (0s) 스피너 시작
  2. (2s) ✓ "회사가 세팅되었습니다" — 체크 애니메이션
  3. (4s) ✓ "CEO 에이전트가 일할 준비를 시작했습니다"
  4. (7s) ✓ "시장 조사를 시작합니다..."
  5. (10s) ✓ "경쟁사를 분석하고 있습니다..."
  6. (13s) ✓ "첫 번째 일감을 준비하고 있습니다..."
  7. (16s) ✓ "세팅이 완료되었습니다!"
  8. (18s) 전환 → 이메일 캡처 화면

**느끼는 것:**
- "와 실제로 뭔가 돌아가고 있다"
- "CEO 에이전트? 대박, 내 회사에 CEO가 생겼네"
- "빨리 결과를 보고 싶다"

**하는 것:**
- (자동 전환) 18초 후 이메일 캡처 화면으로

**수용 기준:**
- [ ] 실제 서버 API 호출 없음 — 100% 프론트엔드 연출
- [ ] 각 메시지는 순차적으로 fade-in + 체크마크 애니메이션
- [ ] 총 소요 시간: 16-20초
- [ ] 브라우저 뒤로가기 시 온보딩 확인 페이지로 (로딩 재시작 가능)
- [ ] `onboarding_loading_started` / `onboarding_loading_completed` Amplitude 이벤트
- [ ] 로딩 중 이탈 시 `onboarding_loading_abandoned(elapsed_seconds: N)` 이벤트

---

### 퍼널 4: 이메일 캡처 + 로그인 — "하는 것" (전환)

---

#### US-4.1: 이메일 캡처 (매직링크 로그인)

**As a** 로딩 완료 후 흥분된 상태의 방문자
**I want to** 이메일을 입력해서 첫 결과를 받아보고 싶다
**So that** 내 AI 회사의 첫 작업 결과를 확인할 수 있다

**보는 것:**
- "세팅이 완료되었습니다!"
- "첫 결과를 확인할 이메일을 입력해주세요"
- 이메일 인풋 (큰 사이즈, 중앙 정렬)
- "결과 받아보기" 버튼
- 작은 텍스트: "매직링크가 전송됩니다. 비밀번호 없이 로그인합니다."

**느끼는 것:**
- "이메일만 넣으면 되네, 간단하다"
- "빨리 결과를 보고 싶다"

**하는 것:**
- 이메일 입력 → "결과 받아보기" 클릭
- → 서버: 유저 생성 (plan: free) + 온보딩 데이터 저장
- → AgentMail로 매직링크 발송
- → "이메일을 확인해주세요" 안내 화면

**수용 기준:**
- [ ] 이메일 validation (형식 체크)
- [ ] POST /api/onboarding/complete — body: { email, idea, target, valueProp, competitors }
- [ ] 서버: users 테이블에 유저 생성 + onboarding_data 컬럼 (JSONB)에 저장
- [ ] 매직링크 이메일 발송 (AgentMail)
- [ ] 매직링크 callbackUrl = `/onboarding/redirect` (결제 페이지로 리다이렉트하는 중간 라우트)
- [ ] "이메일을 확인해주세요" 화면 표시 (이메일 재전송 버튼 포함)
- [ ] `signup_completed(source: "onboarding")` Amplitude 이벤트
- [ ] 중복 이메일: 기존 유저면 로그인 링크만 발송 (온보딩 데이터 업데이트)

---

#### US-4.2: 매직링크 인증 → 결제 리다이렉트

**As a** 매직링크를 클릭한 유저
**I want to** 로그인 후 바로 결제 페이지를 보고 싶다
**So that** AI 회사를 활성화할 플랜을 선택할 수 있다

**보는 것:**
- 매직링크 클릭 → 자동 인증
- → `/onboarding/redirect` → 자동으로 `/pricing` 리다이렉트
- (대시보드가 아닌 결제 페이지가 첫 랜딩)

**수용 기준:**
- [ ] `/onboarding/redirect` 라우트: 인증 확인 → /pricing 리다이렉트
- [ ] 인증 실패 시 → /login 으로 리다이렉트
- [ ] 유저의 `onboarding_completed` 플래그가 true인 경우만 /pricing으로 (이후 로그인은 /dashboard로)
- [ ] `magic_link_verified(redirect: "pricing")` Amplitude 이벤트

---

### 퍼널 5: 결제 — "하는 것" (매출)

---

#### US-5.1: 온보딩 맥락 결제 페이지

**As a** 온보딩을 마치고 처음 로그인한 유저
**I want to** 내 AI 회사를 활성화할 플랜을 선택하고 싶다
**So that** 실제로 AI 에이전트가 일하기 시작한다

**보는 것:**
- 상단: "AI 회사가 준비되었습니다" + 온보딩에서 입력한 사업 아이디어 표시
- 플랜 카드 3개:
  - Free: 100 크레딧, 1 인스턴스 — "체험하기"
  - Starter ($19/mo): 1,000 크레딧, 3 인스턴스 — "시작하기" (추천 배지)
  - Pro ($49/mo): 3,000 크레딧, 10 인스턴스 — "성장하기"
- 각 플랜 아래: "선택" 버튼
- 하단: "무료로 먼저 써볼게요" 텍스트 링크 → /dashboard

**느끼는 것:**
- "이미 회사가 준비되었으니 빨리 활성화하고 싶다"
- "무료도 있으니 부담 없다"

**하는 것:**
- 유료 플랜 선택 → Stripe Checkout → 결제 완료
- 또는 "무료로 먼저 써볼게요" → /dashboard (이메일 드립 캠페인 시작)

**수용 기준:**
- [ ] `/pricing` 라우트 — 온보딩 완료 유저에게는 상단에 사업 아이디어 표시
- [ ] 일반 방문자에게는 기존 프라이싱 페이지와 동일하게 표시
- [ ] Starter 플랜에 "추천" 배지
- [ ] 유료 선택 → POST /api/stripe/checkout → Stripe Checkout
- [ ] 무료 선택 → /dashboard 이동 + `plan_selected(plan: "free", source: "onboarding")` 이벤트
- [ ] `plan_selected(plan: "starter"|"pro", source: "onboarding")` Amplitude 이벤트

---

#### US-5.2: 결제 완료 → 실제 인스턴스 프로비저닝

**As a** 유료 결제를 완료한 유저
**I want to** 결제 후 실제로 내 AI 회사가 동작하기 시작하는 것을 보고 싶다
**So that** 돈을 낸 보람을 느낀다

**보는 것:**
- Stripe Checkout 성공 → `/dashboard` 리다이렉트
- 대시보드에 "회사 프로비저닝 중..." 상태 표시
- 60초 내 "Running" 상태로 변경

**하는 것:**
- Stripe webhook `checkout.session.completed` →
  1. 유저 plan 업데이트
  2. 크레딧 충전
  3. **실제 Paperclip 인스턴스 생성** (온보딩 데이터 전달)
  4. Slack #ai-paperclipweb 결제 알림

**수용 기준:**
- [ ] Stripe webhook에서 onboarding_data를 읽어 인스턴스에 전달
- [ ] 인스턴스 생성 시 company name = 온보딩 아이디어 기반 자동 생성
- [ ] 프로비저닝 완료 후 대시보드 자동 갱신 (polling 또는 SSE)
- [ ] `instance_provisioned(source: "onboarding_payment", plan: "starter")` Amplitude 이벤트

---

### 퍼널 6: 이메일 드립 캠페인 — "느끼는 것" (무료 유저 → 결제 전환)

---

#### US-6.1: 이메일 드립 — 가입 직후 (Day 0)

**As a** 무료로 시작한 유저
**I want to** 가입 직후 "회사 세팅 완료" 이메일을 받고 싶다
**So that** 서비스가 실제로 동작하고 있다고 느낀다

**이메일 내용:**
```
제목: ✓ [사업아이디어 요약] 회사 세팅이 완료되었습니다

본문:
안녕하세요,

[사업아이디어]를 위한 AI 회사가 세팅되었습니다.
CEO 에이전트가 첫 번째 작업을 시작했습니다.

현재 진행 중:
• 시장 조사 시작
• 경쟁사 [입력한 경쟁사] 분석 중
• 타겟 고객 [입력한 타겟] 리서치

내일 첫 결과를 보내드리겠습니다.

[플랜 업그레이드하고 지금 바로 확인하기] ← CTA 버튼 → /pricing
```

**수용 기준:**
- [ ] 가입 즉시 자동 발송 (AgentMail)
- [ ] 온보딩 데이터 기반 개인화 (아이디어, 타겟, 경쟁사)
- [ ] CTA 링크 → /pricing (utm_source=email, utm_campaign=drip_d0)
- [ ] 유료 결제 완료 유저에게는 발송하지 않음
- [ ] `drip_email_sent(day: 0)` / `drip_email_clicked(day: 0)` Amplitude 이벤트

---

#### US-6.2: 이메일 드립 — Day 1

**As a** 어제 가입한 무료 유저
**I want to** "시장 조사 완료" 이메일을 받고 싶다
**So that** 궁금해서 결제하고 싶어진다

**이메일 내용:**
```
제목: 📊 [사업아이디어] 시장 조사가 완료되었습니다

본문:
CEO 에이전트가 [타겟] 시장 조사를 완료했습니다.

발견한 내용 (미리보기):
• 시장 규모: ██████ (플랜 업그레이드 시 확인)
• 경쟁사 약점 3가지 발견
• 타겟 고객의 핵심 불만 포인트 파악

전체 리포트를 확인하려면 플랜을 업그레이드하세요.

[전체 리포트 확인하기] ← CTA 버튼 → /pricing
```

**수용 기준:**
- [ ] 가입 후 24시간 뒤 자동 발송
- [ ] 블러 처리된 미리보기 (실제 데이터 아님, 템플릿)
- [ ] 유료 결제 완료 유저에게는 발송 중단
- [ ] `drip_email_sent(day: 1)` / `drip_email_clicked(day: 1)` Amplitude 이벤트

---

#### US-6.3: 이메일 드립 — Day 2

**As a** 이틀 전 가입한 무료 유저
**I want to** "첫 리드 발견" 이메일을 받고 싶다
**So that** "리드까지 찾아줬다니" 하고 결제 충동을 느낀다

**이메일 내용:**
```
제목: 🎯 [사업아이디어] 첫 번째 잠재 고객을 발견했습니다

본문:
아웃바운드 에이전트가 [타겟]에 맞는 잠재 고객을 발견했습니다.

발견된 리드:
• ████████ (██ 산업, ██명 규모)
• 접근 가능한 채널: ██████

이 리드에 자동으로 메시지를 보내려면 플랜을 업그레이드하세요.

[리드 확인하고 메시지 보내기] ← CTA 버튼 → /pricing
```

**수용 기준:**
- [ ] 가입 후 48시간 뒤 자동 발송
- [ ] 블러 처리된 리드 정보 (실제 아님)
- [ ] 유료 결제 완료 유저에게는 발송 중단
- [ ] `drip_email_sent(day: 2)` / `drip_email_clicked(day: 2)` Amplitude 이벤트

---

#### US-6.4: 이메일 드립 — Day 3 (마지막)

**As a** 3일 전 가입한 무료 유저
**I want to** "3일 리포트" 이메일을 받고 싶다
**So that** 종합 리포트에 대한 궁금증으로 결제한다

**이메일 내용:**
```
제목: 📋 [사업아이디어] 3일간의 작업 리포트

본문:
3일간 AI 회사가 작업한 결과를 요약했습니다:

✓ 시장 조사 완료 — 경쟁사 ██개 분석
✓ 잠재 고객 ██명 발견
✓ 아웃바운드 메시지 ██건 준비 완료
✓ 제품 스펙 초안 작성

이 모든 결과를 확인하고 실행하려면:

[전체 리포트 확인하기] ← CTA 버튼 → /pricing

지금 시작하면 첫 달 모든 결과를 활용할 수 있습니다.
```

**수용 기준:**
- [ ] 가입 후 72시간 뒤 자동 발송
- [ ] 이후 추가 드립 없음 (3일로 한정)
- [ ] 유료 결제 완료 유저에게는 발송 중단
- [ ] `drip_email_sent(day: 3)` / `drip_email_clicked(day: 3)` Amplitude 이벤트

---

## 기술 요구사항 요약

### 새로운 라우트

| 라우트 | 용도 |
|--------|------|
| `/` | 랜딩 리디자인 (소셜프루프) |
| `/onboarding` | 온보딩 질문 플로우 (step 1-5) |
| `/onboarding/loading` | 로딩 연출 페이지 |
| `/onboarding/email` | 이메일 캡처 |
| `/onboarding/check-email` | "이메일 확인" 안내 |
| `/onboarding/redirect` | 매직링크 인증 후 /pricing 리다이렉트 |
| `/pricing` | 결제 페이지 (온보딩 맥락 표시) |

### 새로운 API

| 엔드포인트 | 용도 |
|-----------|------|
| `POST /api/onboarding/complete` | 온보딩 데이터 저장 + 유저 생성 + 매직링크 발송 |
| `GET /api/github/stars` | GitHub star count + 30일 추이 (캐시 1h) |
| `POST /api/drip/schedule` | 드립 이메일 스케줄링 (내부, cron 또는 queue) |

### DB 변경

| 변경 | 내용 |
|------|------|
| users 테이블 | `onboarding_data JSONB` 컬럼 추가 |
| users 테이블 | `onboarding_completed_at TIMESTAMPTZ` 컬럼 추가 |
| 새 테이블 | `drip_emails` — 발송 스케줄 + 상태 추적 |

### Amplitude 이벤트 (신규)

| 이벤트 | 트리거 |
|--------|--------|
| `onboarding_started` | /onboarding 진입 |
| `onboarding_step_completed` | 각 질문 완료 (step, field, skipped) |
| `onboarding_confirmed` | "회사 만들기" 클릭 |
| `onboarding_loading_started` | 로딩 페이지 진입 |
| `onboarding_loading_completed` | 로딩 완료 (18초) |
| `onboarding_loading_abandoned` | 로딩 중 이탈 (elapsed_seconds) |
| `signup_completed` | 이메일 제출 (source: onboarding) |
| `magic_link_verified` | 매직링크 인증 (redirect: pricing) |
| `plan_selected` | 플랜 선택 (plan, source) |
| `drip_email_sent` | 드립 이메일 발송 (day) |
| `drip_email_clicked` | 드립 이메일 CTA 클릭 (day) |

---

## 가설 업데이트

기존 가설에 추가:

### OH1 (Onboarding Hypothesis 1): 사업아이디어 입력 → 로딩 연출이 결제 전환율을 높인다
- **측정:** onboarding_confirmed → plan_selected(plan: paid) 전환율
- **성공 기준:** 온보딩 완료 유저의 15% 이상이 유료 결제
- **Kill 기준:** 온보딩 완료 유저의 5% 미만이 유료 결제 (2주 후)

### OH2 (Onboarding Hypothesis 2): 드립 이메일이 무료 유저를 유료로 전환한다
- **측정:** drip_email_clicked → checkout_completed 전환율
- **성공 기준:** 드립 수신 유저의 8% 이상이 결제
- **Kill 기준:** 드립 수신 유저의 2% 미만이 결제 (3주 후)

### OH3 (Onboarding Hypothesis 3): 소셜프루프가 온보딩 시작률을 높인다
- **측정:** landing_page_view → onboarding_started 전환율
- **성공 기준:** 방문자의 20% 이상이 온보딩 시작
- **Kill 기준:** 방문자의 5% 미만이 온보딩 시작 (2주 후)

---

## 퍼널 전체 시나리오 (Happy Path)

```
1. 김준호, Google에서 "paperclip hosting" 검색
2. paperclipweb.app 클릭 → 랜딩 페이지
3. GitHub Stars 12,847개, Twitter 멘션 캐러셀 확인 → "오 꽤 유명하네"
4. "내 AI 회사 만들기" CTA 클릭
5. "AI로 부동산 리드를 자동 발굴하는 서비스" 입력
6. "소규모 부동산 중개사무소" (타겟)
7. "수작업 리드 발굴 시간을 90% 줄여줌" (가치)
8. "직방, 네이버 부동산" (경쟁사)
9. 확인 → "회사 만들기" 클릭
10. 로딩 연출 16초 — "CEO가 준비 중... 시장 조사 시작... 세팅 완료!"
11. "이메일을 입력하세요" → junho@example.com 입력
12. 매직링크 이메일 수신 → 클릭
13. /pricing 페이지 → Starter $19/mo 선택
14. Stripe Checkout → 결제 완료
15. → 대시보드: 실제 Paperclip 인스턴스 프로비저닝 중...
16. 60초 후: Running 상태 → 에이전트 사용 시작
```

```
(결제 안 한 경우)
13. /pricing → "무료로 먼저 써볼게요" 클릭
14. /dashboard (빈 상태)
15. Day 0: "회사 세팅 완료" 이메일 수신
16. Day 1: "시장 조사 완료" 이메일 → 블러 미리보기 → 궁금
17. Day 2: "첫 리드 발견" 이메일 → "리드까지 찾아줬다고?"
18. Day 3: "3일 리포트" 이메일 → CTA 클릭 → /pricing → 결제
```

---

## 다음 단계 (개발 시)

1. **디자인** — @product-designer: 온보딩 플로우 UI/UX + 로딩 연출 모션
2. **개발** — @product-developer: 새 라우트 + API + DB 마이그레이션
3. **이메일** — AgentMail 드립 템플릿 + 스케줄링 로직
4. **QA** — 온보딩 전체 플로우 E2E 테스트
