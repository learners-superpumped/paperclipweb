// 유튜브 케이스 5개 — 랜딩 카드 + 케이스 선택 + mock 온보딩 preset이 모두 여기서 읽음.
// 진실 출처: aicompany-operation/services/paperclip/dev/spec.md ## 3 와우경험 ## 케이스 5개

export type EmployeeRole =
  | "CEO"
  | "Content Designer"
  | "Caption Writer"
  | "SEO Strategist"
  | "Content Writer"
  | "Content Curator"
  | "Email Designer"
  | "Trend Scout"
  | "Video Scripter"
  | "CS Manager"
  | "Email Responder";

export interface CaseEmployee {
  role: EmployeeRole;
  name: string;
  bio: string; // mock 자기소개 preset
}

export interface YoutubeRef {
  title: string;
  url: string; // placeholder until 사용자가 채움
}

export interface CaseTemplate {
  id: string; // url slug
  company: string;
  emoji: string;
  oneLiner: string;
  mission: string;
  employees: CaseEmployee[];
  sampleTask: {
    title: string;
    description: string;
    presetResult: string; // mock 결과 (마크다운)
  };
  youtube: YoutubeRef[];
}

export const CASES: CaseTemplate[] = [
  {
    id: "ai-insta-influencer",
    company: "Solo Influencer Inc.",
    emoji: "📸",
    oneLiner: "AI 인스타 인플루언서 회사",
    mission: "매일 인스타 포스트 1건 + DM 자동 답변으로 협찬 매출 만들기",
    employees: [
      {
        role: "CEO",
        name: "Mina",
        bio: "안녕하세요, Solo Influencer Inc. 의 CEO Mina 입니다. 매일 한 포스트씩 올려서 협찬 매출까지 갈 수 있게 직원들 운영해드릴게요.",
      },
      {
        role: "Content Designer",
        name: "Jay",
        bio: "포스트 비주얼은 제가 책임집니다. Modern Minimal 톤으로 일관성 있게.",
      },
      {
        role: "Caption Writer",
        name: "Eun",
        bio: "캡션·해시태그·DM 답변까지. 사람이 쓴 것처럼 자연스럽게 쓰는 게 제 일이에요.",
      },
    ],
    sampleTask: {
      title: "이번 주 카페 인스타 캡션 3개 + 해시태그",
      description: "이번 주 카페 신메뉴 포스트 3개의 캡션과 해시태그를 만들어주세요. 톤은 따뜻하고 친근하게.",
      presetResult: `**포스트 1 — 봄 한정 라떼**
☕️ 봄이 입에 닿는 순간. 벚꽃 시럽 한 스푼이 만들어내는 분홍빛 라떼, 이번 주만 만나요. 오늘 오후, 잠깐의 봄 한 잔 어때요? #봄한정 #벚꽃라떼 #카페스타그램 #오늘의카페 #봄메뉴

**포스트 2 — 주말 브런치 세트**
🥐 늦잠 잔 토요일에 어울리는 브런치 세트. 크루아상 + 에그 베네딕트 + 따끈한 드립커피. 주말의 첫 한 입을 책임집니다. #주말브런치 #브런치맛집 #에그베네딕트 #카페추천 #주말일상

**포스트 3 — 시그니처 디저트 신메뉴**
🍰 한입에 사라지는 진한 초콜릿 가나슈. 이번 주 새로 들어온 시그니처 디저트 만나보세요. 커피 한 잔이 더 깊어지는 페어링. #시그니처디저트 #초콜릿케이크 #디저트맛집 #카페신메뉴 #달콤한오후`,
    },
    youtube: [
      { title: "AI 로 인스타 운영해서 월 500만원 (사례)", url: "https://youtube.com/<placeholder-1>" },
      { title: "1인 인플루언서가 AI 직원 쓰는 법", url: "https://youtube.com/<placeholder-2>" },
    ],
  },
  {
    id: "ai-blog-seo",
    company: "Passive Income LLC",
    emoji: "📝",
    oneLiner: "AI 블로그 SEO 농장",
    mission: "주 5편 SEO 글로 애드센스 + 제휴 마케팅 수익 누적",
    employees: [
      {
        role: "CEO",
        name: "Hyun",
        bio: "안녕하세요, Passive Income LLC CEO Hyun 입니다. SEO 키워드 발굴부터 글 발행까지 주 5편씩 안정적으로 돌릴게요.",
      },
      {
        role: "SEO Strategist",
        name: "Tara",
        bio: "월간 검색량·경쟁도 보고 키워드 우선순위 정합니다. 한 달 6개월 plan 짜는 게 제 전공.",
      },
      {
        role: "Content Writer",
        name: "Sangwoo",
        bio: "키워드 받으면 1500~2500자 SEO 본문을 사람이 쓴 것처럼 풀어드립니다. 출처 인용 깔끔하게.",
      },
    ],
    sampleTask: {
      title: "'노션 템플릿' 키워드 SEO 글 1편",
      description: "'노션 템플릿' 키워드로 2000자 SEO 본문 + 메타 디스크립션. 초보 대상.",
      presetResult: `# 노션 템플릿 추천 — 초보가 바로 쓸 만한 7가지

업무·생활을 노션 한 곳으로 정리하고 싶은데, 빈 페이지부터 만들기 막막하신가요? 이 글에서는 다운로드하자마자 그대로 쓰기 좋은 노션 템플릿 7가지를 골라 정리했습니다. 직접 써본 후기와 함께 어떤 상황에 어떤 템플릿이 맞는지 한 번에 비교해보세요.

## 1. 일일 업무 트래커
하루를 시간대별로 나눠 task 를 옮겨가며 처리하는 카드형 템플릿. 오전·오후·저녁 3개의 열로 단순화되어 있어 어디서부터 시작할지 막막한 날에 특히 좋습니다…

## 2. 한 주 리뷰 (Weekly Review)
일요일 저녁 15분이면 끝나는 회고 템플릿. "이번 주에 좋았던 일·아쉬운 일·다음 주에 할 일" 3칸 구조로, 일기보다 가볍게 시작할 수 있습니다…

(이하 본문 1800자 분량 — 데모용 미리보기 끝)

**메타 디스크립션**: 노션 템플릿 추천 초보용 7가지를 직접 써본 후기와 함께 비교합니다. 일일 트래커·주간 리뷰·독서 노트 등.`,
    },
    youtube: [
      { title: "AI 블로그 1개로 월 300만원 (실제 사례)", url: "https://youtube.com/<placeholder-1>" },
      { title: "SEO 블로그 자동화 step-by-step", url: "https://youtube.com/<placeholder-2>" },
    ],
  },
  {
    id: "ai-newsletter",
    company: "Newsletter Empire",
    emoji: "✉️",
    oneLiner: "AI 이메일 뉴스레터 회사",
    mission: "주 2회 뉴스레터로 광고 매출 + 유료 구독자 누적",
    employees: [
      {
        role: "CEO",
        name: "Soo",
        bio: "Newsletter Empire CEO Soo 입니다. 주제 발굴부터 발송까지 주 2회 정기적으로 가져갈 수 있게.",
      },
      {
        role: "Content Curator",
        name: "Min",
        bio: "이번 주 핵심 뉴스를 모으고, 한 번에 읽을 만한 흐름으로 큐레이션합니다.",
      },
      {
        role: "Email Designer",
        name: "Jin",
        bio: "이메일 레이아웃·CTA 배치까지 — 모바일에서 잘 읽히는 게 제일 중요해요.",
      },
    ],
    sampleTask: {
      title: "이번 주 'AI 자동화' 뉴스레터 1편",
      description: "이번 주 AI 자동화 트렌드 뉴스 5개 큐레이션 + 짧은 인사이트 + CTA 1개.",
      presetResult: `**제목**: 이번 주 AI 자동화, 진짜 바뀐 5가지

안녕하세요. 이번 주도 *Newsletter Empire* 와 함께해주셔서 감사합니다. 오늘은 실제로 일하는 방식이 바뀐 5가지 뉴스만 골라봤어요.

1. **Anthropic, 매니지드 에이전트 GA** — 이제 회사가 자기 시스템 프롬프트만 들고 가면 백엔드는 Anthropic 이 다 운영. 작은 팀일수록 큰 영향. *왜 중요한가*: 인프라 0줄 짜면서 24시간 도는 봇을 갖게 됐다는 뜻.
2. **OpenAI Codex CLI 1.0** — 비대화형 코드 자동화. CI 안에서 자가 코드 작성이 현실화. *왜 중요한가*: 1인 개발자가 사실상 풀스택 팀이 되는 첫 신호.
3. (이하 3개 — 데모 미리보기 끝)

—

이번 주의 한 줄: **"인프라가 아니라 의도를 들고 가는 시대"**.

[👉 풀스토리 읽기 / 광고 문의하기]`,
    },
    youtube: [
      { title: "뉴스레터 1만 구독자로 월 200만원", url: "https://youtube.com/<placeholder-1>" },
      { title: "AI 로 주 2회 뉴스레터 자동화", url: "https://youtube.com/<placeholder-2>" },
    ],
  },
  {
    id: "ai-shorts",
    company: "Shorts Factory",
    emoji: "🎬",
    oneLiner: "AI 쇼츠/릴스 양산 회사",
    mission: "매일 쇼츠 3건으로 광고 수익 + 채널 성장",
    employees: [
      {
        role: "CEO",
        name: "Beom",
        bio: "Shorts Factory CEO Beom 입니다. 매일 트렌드 + 스크립트 + 자막까지 한 사이클로 돌릴게요.",
      },
      {
        role: "Trend Scout",
        name: "Nara",
        bio: "오늘의 트렌딩 키워드·해시·BGM 까지 30분 단위로 모니터링합니다.",
      },
      {
        role: "Video Scripter",
        name: "Doori",
        bio: "15~60초 스크립트 전문. 첫 3초 후킹은 제가 가장 잘합니다.",
      },
    ],
    sampleTask: {
      title: "이번 주 트렌드 기반 쇼츠 스크립트 3개",
      description: "이번 주 IT/생산성 트렌드 기반 15~30초 쇼츠 스크립트 3편. 후킹·본문·CTA 분리.",
      presetResult: `**쇼츠 1 — "ChatGPT 보다 빠른 3가지"** (20s)
[Hook 3s] "ChatGPT 한 번도 안 쓰면 무서워서 못 잘 정도예요. 근데 이거보다 빠른 거 3가지 알려드릴게요."
[Body 14s] 1) 로컬 단축키 1번으로 부르는 사이드바, 2) 음성 입력 + 즉시 답변, 3) 새 모델 가벼운 버전을 단축키로.
[CTA 3s] "댓글에 'AI' 적어주시면 단축키 모음 보내드릴게요."

**쇼츠 2 — "직장에서 들키지 않고 AI 쓰는 법"** (25s)
[Hook] "회사 정책상 AI 못 쓴다고요? 이렇게 하면 들킬 일 없어요."
[Body] 1) 로컬 LLM, 2) 사내 정책 회피 X — 회사 승인된 도구 우선 확인 등 안전 강조.
[CTA] "팔로우 + 알림 켜기 = 출근 전 AI 팁 매일 1개."

**쇼츠 3 — "메모 앱 안 쓰면 30대에 후회하는 이유"** (28s)
[Hook] "30대 되면 메모 못 한 게 진짜 후회됩니다."
[Body] 회상의 정확도 + 의사결정 일관성 + 인생 회고용 데이터 — 3가지.
[CTA] "오늘 한 줄이라도 메모 시작해보세요. 댓글로 한 줄 적어주시면 답변드릴게요."`,
    },
    youtube: [
      { title: "쇼츠 자동화로 채널 키운 사례", url: "https://youtube.com/<placeholder-1>" },
      { title: "AI 로 매일 쇼츠 3개 만드는 법", url: "https://youtube.com/<placeholder-2>" },
    ],
  },
  {
    id: "ai-cs-bot",
    company: "CS Bot Co.",
    emoji: "💬",
    oneLiner: "AI 고객 응대 자동화 회사",
    mission: "카톡·이메일 CS 자동 답변으로 외주 매출",
    employees: [
      {
        role: "CEO",
        name: "Hana",
        bio: "CS Bot Co. CEO Hana 입니다. 가게·쇼핑몰 사장님들 CS 응대 24시간 대신해드릴게요.",
      },
      {
        role: "CS Manager",
        name: "Joon",
        bio: "응대 톤·환불 정책·반복 문의 분류까지 총괄합니다.",
      },
      {
        role: "Email Responder",
        name: "Vi",
        bio: "들어오는 이메일에 사람이 쓴 것처럼 답신을 씁니다. 친절·정확·간결이 원칙이에요.",
      },
    ],
    sampleTask: {
      title: "환불 요청 메일 답장 초안",
      description: "환불 요청 고객 이메일 1건. 친절하지만 회사 정책 (7일 이내 영수증 첨부) 안에서 답변.",
      presetResult: `**받는 사람**: 고객님

안녕하세요, CS Bot Co. 입니다. 먼저 불편을 드린 점 진심으로 사과드립니다.

문의 주신 환불 건 확인했습니다. 저희 환불 정책은 **구매일로부터 7일 이내 + 영수증 사진 첨부** 시 전액 환불을 안내드리고 있습니다.

오늘이 구매 5일째라 환불 가능 기간 안에 있고, 영수증 사진만 회신 메일에 첨부해주시면 바로 환불 처리 도와드리겠습니다. 영수증 분실이라도 결제 카드 마지막 4자리만 알려주시면 결제 내역으로 대신 확인 가능합니다.

더 빠른 처리 원하시면 카톡 채널 '@csbotco' 로도 문의 주세요. 평일 9~18시 5분 안에 답변드립니다.

다시 한 번 불편 드려 죄송하고, 빠르게 정리해드리겠습니다.

CS Bot Co. 드림`,
    },
    youtube: [
      { title: "CS 자동화로 외주 따낸 사례", url: "https://youtube.com/<placeholder-1>" },
      { title: "1인 사장 AI 고객응대 만들기", url: "https://youtube.com/<placeholder-2>" },
    ],
  },
];

export function findCase(id: string): CaseTemplate | undefined {
  return CASES.find((c) => c.id === id);
}
