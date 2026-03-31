# Product Spec: paperclipweb

**Version:** 1.0
**Date:** 2026-03-31
**Platform:** Web
**Status:** Draft

---

## Part 1: 제품 정의

### 리서치 분석 요약

**경쟁사 공통 약점:**
- BYOK(Bring Your Own Key) 모델로 인한 멀티 청구 복잡성 (PaperclipCloud, Railway, Zeabur, Hostinger 모두 BYOK)
- PaperclipCloud는 무료 티어 부재, 서버 스펙 불투명 ("standard/faster/fastest")
- 셀프 디플로이 대안(Railway, Zeabur, Hostinger)은 기술 역량 필요, 관리 부담

**사용자 불만 패턴:**
- 여러 AI 제공사(Anthropic, OpenAI, Google)에 각각 결제하는 번거로움
- PaperclipCloud Entrepreneur 티어 $69/mo는 1인 창업자에게 과도
- 셀프 호스팅 시 업데이트, 보안, 백업을 직접 관리해야 하는 부담

**가격 기회 (under-served 구간):**
- DIY($5-10/mo)와 PaperclipCloud Entrepreneur($69/mo) 사이 $15-$49 구간이 비어 있음
- 번들 크레딧 제공 서비스가 전무 (PaperclipCloud는 "coming soon" 상태)

**미충족 니즈:**
- 하나의 청구서로 인프라 + AI 사용료를 통합 결제
- 무료 체험 후 유료 전환 경로
- 투명한 리소스 스펙 공개

### 타겟 사용자

**페르소나: 김준호 (29세, 1인 SaaS 창업자)**

- **직업:** 풀스택 개발자 출신, 현재 1인 AI 기반 SaaS 운영
- **상황:** Paperclip으로 CS봇, 콘텐츠 생성, 데이터 분석을 자동화하고 싶지만, Railway에 직접 배포하려니 DB 관리, SSL, 업데이트가 귀찮고, PaperclipCloud $69/mo는 아직 매출이 없어 부담
- **고통:** Anthropic API 키, OpenAI API 키, 인프라 비용을 각각 관리하며 매달 3-4개 청구서를 받고 있음. 새벽에 서버가 죽으면 직접 고쳐야 함
- **새벽 3시에 검색할 문제:** "paperclip hosting cheap bundled credits" -- 서버 다운 알림을 받고 "이걸 누가 대신 관리해주면 좋겠다"

### 핵심 가치 제안

**"1인 창업자를 위한 원빌링 Paperclip"**

### MVP 기능 (단 1개)

**번들 크레딧 포함 원클릭 Paperclip 호스팅**

사용자가 가입 즉시 Paperclip 인스턴스를 생성하고, 별도 API 키 없이 포함된 AI 크레딧으로 에이전트를 실행할 수 있는 서비스.

**유저 스토리:**
1. "1인 창업자로서, 가입 후 60초 이내에 Paperclip 인스턴스를 생성하고 에이전트를 실행할 수 있다. 별도 API 키 설정이 필요 없다."
2. "구독자로서, 매달 하나의 청구서(Stripe)로 인프라비 + AI 사용료를 통합 결제한다. Anthropic/OpenAI에 따로 결제하지 않는다."
3. "무료 사용자로서, 제한된 크레딧으로 Paperclip을 체험한 뒤 유료 전환 여부를 판단할 수 있다."

**이 기능만으로 돈을 낼 이유:**
PaperclipCloud는 BYOK만 제공하고 번들 크레딧을 아직 출시하지 않았다. "API 키 관리 없이 바로 쓴다"는 경험은 월 $19의 가치가 있다. Railway $5 + Anthropic API $20 + OpenAI API $20 = $45/mo를 각각 관리하는 것 대비, $19/mo 단일 청구서는 명확한 가격 이점.

### 키 메시지

**랜딩 헤드라인:** "AI 회사, 바로 시작"

**서브 헤드라인:** "API 키 없이, 청구서 하나로 Paperclip을 운영하세요"

**3가지 가치 포인트:**
1. **원빌링** -- 인프라 + AI 크레딧을 하나의 구독으로 통합
2. **60초 배포** -- 가입 즉시 Paperclip 인스턴스 생성, 서버 설정 불필요
3. **무료 시작** -- 크레딧 카드 없이 시작, 써보고 결정

### 가설 정의 (Pre-PMF)

**가치 가설 (Value Hypothesis)**

### VH1: 사용자가 BYOK 대신 번들 크레딧(원빌링)을 선호한다
- 1주: 가입 30명
- 1달: 가입 200명
- 3달: 가입 1,000명

### VH2: 셀프호스팅($5 Railway) 대비 관리형 서비스에 프리미엄($19/mo)을 지불한다
- 1주: 유료 전환 3명 (가입 대비 10%)
- 1달: 유료 전환 20명 (가입 대비 10%)
- 3달: 유료 전환 80명 (가입 대비 8%)

**성장 가설 (Growth Hypothesis)**

### GH1: Paperclip 오픈소스 커뮤니티(GitHub, Discord)에서 자연 유입된다
- 1주: 방문 500명
- 1달: 방문 3,000명
- 3달: 방문 15,000명

### GH2: 무료 티어 사용자가 SNS/커뮤니티에 자발적으로 공유한다
- 1주: 공유 5건
- 1달: 공유율 8% (무료 사용자 중)
- 3달: 공유율 15%

---

## Part 2: 브랜딩 & 네이밍

### 서비스 이름: paperclipweb

### 도메인 검증 결과

| 도메인 | 가용 | 가격 | 비고 |
|--------|------|------|------|
| paperclipweb.com | 불가 | - | 이미 등록됨 |
| paperclipweb.io | 가용 | $37.99/yr | $20 초과 -- 제외 |
| paperclipweb.co | 가용 | $17.99/yr | 가용, $20 이하 |
| paperclipweb.app | 가용 | $15.00/yr | 가용, $20 이하 |
| paperclipweb.dev | 가용 | $13.00/yr | 가용, $20 이하 |

**대안 후보 검증:**

| 도메인 | 가용 | 가격 | 비고 |
|--------|------|------|------|
| useclipweb.com | 가용 | $11.25/yr | 브랜드 인지도 약함 |
| clipweb.dev | 가용 | $13.00/yr | 브랜드 인지도 약함 |
| getpaperclip.dev | 가용 | $13.00/yr | 가용, Paperclip 본체와 혼동 우려 |

**동명 서비스 검색 결과:**
- "paperclipweb"으로 검색 시 동명 서비스 발견되지 않음
- paperclip.dev는 별도 UI 빌더 프로젝트가 사용 중 (충돌 없음, 다른 도메인)
- paper-clip.web.app은 노트 앱 (다른 제품, 충돌 없음)

**최종 추천: paperclipweb.app ($15/yr)**

이유:
- .app TLD는 웹 서비스에 적합하고 HTTPS가 기본 강제됨
- $15/yr로 저렴
- 동명 서비스 없음
- "paperclipweb"이 서비스명과 도메인이 일치하여 기억하기 쉬움

차선: paperclipweb.dev ($13/yr) -- 개발자 타겟이라 .dev도 적합

### 태그라인

"One bill. One click. Your AI company."

### 로고 & 브랜딩

**컬러 팔레트:**

| 용도 | 색상 | HEX |
|------|------|-----|
| Primary | Deep Indigo | #4F46E5 |
| Secondary | Slate | #475569 |
| Accent | Emerald | #10B981 |
| Background | Snow | #FAFAFA |
| Surface | White | #FFFFFF |
| Error | Rose | #F43F5E |

**로고 스타일:** 미니멀 타이포 + 아이콘
- Paperclip 아이콘(클립 모양)을 심볼로 사용
- 서비스명 "paperclipweb"을 소문자 산세리프로 조합
- 아이콘 컬러는 Primary(#4F46E5), 텍스트는 Slate(#475569)

**폰트 페어링:**
- 제목: Inter (Bold/Semibold) -- 깔끔하고 현대적, 오픈소스
- 본문: Inter (Regular) -- 통일감, 가독성 우수

**브랜드 톤:** 전문적이면서 접근하기 쉬운 (Professional-Approachable)
- 기술 용어는 쓰되, 과도한 전문성은 피함
- "어려운 걸 쉽게" 느낌
- 경쟁사 대비 투명하고 솔직한 커뮤니케이션

---

## Part 3: 기술 세팅

### 기술 스택

| 레이어 | 기술 | 용도 |
|--------|------|------|
| Frontend | Next.js 15 (App Router) | SSR + 대시보드 UI |
| UI | Tailwind CSS + shadcn/ui | 컴포넌트 시스템 |
| Backend | Next.js API Routes (Route Handlers) | REST API |
| Database | Neon PostgreSQL | 유저, 구독, 인스턴스, 사용량 |
| Auth | NextAuth.js v5 | 소셜 로그인 (GitHub, Google) |
| Payments | Stripe | 구독 + 사용량 기반 과금 |
| Analytics | Amplitude | 이벤트 추적, 퍼널 분석 |
| Email | AgentMail | 트랜잭셔널 이메일 |
| Hosting | Vercel | 프론트엔드 + API 배포 |
| Infra Orchestration | Docker (내부) | Paperclip 인스턴스 관리 |

### 환경 변수 템플릿 (.env.example)

```bash
# ============================================
# paperclipweb Environment Variables
# ============================================

# --- App ---
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# --- Database (Neon) ---
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/paperclipweb?sslmode=require

# --- Auth (NextAuth v5) ---
AUTH_SECRET=your-auth-secret-here
AUTH_GITHUB_ID=your-github-oauth-id
AUTH_GITHUB_SECRET=your-github-oauth-secret
AUTH_GOOGLE_ID=your-google-oauth-id
AUTH_GOOGLE_SECRET=your-google-oauth-secret

# --- Stripe ---
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRO_PRICE_ID=price_xxx
STRIPE_BUSINESS_PRICE_ID=price_xxx

# --- Amplitude ---
NEXT_PUBLIC_AMPLITUDE_API_KEY=your-amplitude-api-key

# --- AgentMail ---
AGENTMAIL_API_KEY=your-agentmail-api-key
AGENTMAIL_INBOX_ID=your-inbox-id

# --- AI Provider Keys (서버 내부용, 번들 크레딧 라우팅) ---
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx

# --- Paperclip Instance Management ---
PAPERCLIP_DOCKER_REGISTRY=ghcr.io/paperclipai/paperclip
PAPERCLIP_DEFAULT_VERSION=latest
```

### 사용자 세팅 체크리스트

```markdown
## 사용자가 직접 해야 하는 설정
- [ ] GitHub repo 생성 (learners-superpumped org)
- [ ] Vercel 프로젝트 생성 + GitHub 연결
- [ ] Neon DB 생성
- [ ] Stripe 계정 + API 키
- [ ] Stripe Webhook 엔드포인트 (/api/webhooks/stripe)
- [ ] Stripe 상품/가격 생성 (Pro $19/mo, Business $49/mo)
- [ ] Amplitude 프로젝트 생성
- [ ] AgentMail 인박스 생성
- [ ] 도메인 구매 (paperclipweb.app 추천) + Vercel 연결
- [ ] GitHub OAuth App 생성
- [ ] Google OAuth 설정
- [ ] .env.local 작성 (.env.example 참고)
```

---

## Part 4: MVP 범위 상세

### 유저 플로우

```
[랜딩페이지] → [GitHub/Google 로그인] → [대시보드]
    ↓
[Create Company 버튼] → [회사명 입력 + 에이전트 선택]
    ↓
[Paperclip 인스턴스 프로비저닝 (60초)]
    ↓
[대시보드에서 에이전트 활동 모니터링]
    ↓
[크레딧 소진 시] → [Pro 업그레이드 유도]
    ↓
[Stripe Checkout] → [구독 활성화 + 크레딧 충전]
```

### 핵심 기능 목록

**Must-have (MVP):**
1. 원클릭 Paperclip 인스턴스 생성
2. 번들 AI 크레딧 (Anthropic/OpenAI 프록시)
3. Stripe 구독 결제 (Free / Pro / Business)
4. 사용량 대시보드 (크레딧 잔액, 에이전트 활동)
5. GitHub/Google 소셜 로그인

**Nice-to-have (v2):**
- 커스텀 도메인 연결
- 팀 멤버 초대
- BYOK 모드 (자체 API 키 사용 옵션)
- 멀티 프로바이더 AI 라우팅 (비용/성능 자동 최적화)
- Webhook 알림

### 주요 API 엔드포인트

```
POST   /api/auth/[...nextauth]     — 인증
POST   /api/companies              — 회사(인스턴스) 생성
GET    /api/companies              — 내 회사 목록
GET    /api/companies/:id          — 회사 상세
DELETE /api/companies/:id          — 회사 삭제
GET    /api/companies/:id/usage    — 사용량 조회
POST   /api/billing/checkout       — Stripe Checkout 세션 생성
POST   /api/billing/portal         — Stripe Customer Portal
POST   /api/webhooks/stripe        — Stripe Webhook 수신
GET    /api/credits/balance        — 크레딧 잔액 조회
POST   /api/proxy/ai               — AI API 프록시 (크레딧 차감)
```

### DB 스키마 (핵심 테이블)

```sql
-- 사용자
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    image TEXT,
    stripe_customer_id TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 구독
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT UNIQUE,
    plan TEXT NOT NULL DEFAULT 'free', -- free, pro, business
    status TEXT NOT NULL DEFAULT 'active', -- active, canceled, past_due
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Paperclip 인스턴스 (회사)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'provisioning', -- provisioning, running, stopped, error
    paperclip_version TEXT DEFAULT 'latest',
    instance_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 크레딧 잔액
CREATE TABLE credit_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    balance_cents INTEGER NOT NULL DEFAULT 0, -- 크레딧 잔액 (센트 단위)
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 크레딧 사용 내역
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    amount_cents INTEGER NOT NULL, -- 양수: 충전, 음수: 사용
    type TEXT NOT NULL, -- 'grant', 'subscription', 'usage', 'topup'
    provider TEXT, -- 'anthropic', 'openai'
    model TEXT, -- 'claude-4-sonnet', 'gpt-4o' 등
    tokens_input INTEGER,
    tokens_output INTEGER,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_companies_user ON companies(user_id);
CREATE INDEX idx_credit_tx_user ON credit_transactions(user_id);
CREATE INDEX idx_credit_tx_created ON credit_transactions(created_at);
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
```

---

## 요약

| 항목 | 값 |
|------|---|
| 서비스명 | paperclipweb |
| 한줄 설명 | API 키 없이, 청구서 하나로 Paperclip을 운영하는 호스팅 서비스 |
| 타겟 | 1인 SaaS 창업자 (비기술/준기술, BYOK 피로감) |
| 핵심 기능 | 번들 크레딧 포함 원클릭 Paperclip 호스팅 |
| 플랫폼 | Web (Next.js + Vercel) |
| 추천 도메인 | paperclipweb.app ($15/yr) |
| 브랜드 톤 | Professional-Approachable |
| 가격 전략 | @product-pricing 에이전트 담당 (별도) |
