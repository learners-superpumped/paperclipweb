// 5 YouTube-validated AI automation case templates.
// Single source for landing case cards, case picker, and mock onboarding presets.
// Truth: aicompany-operation/services/paperclip/dev/spec.md ## 3 wow experience.

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
  bio: string;
}

export interface YoutubeRef {
  title: string;
  url: string;
}

export interface CaseTemplate {
  id: string;
  company: string;
  emoji: string;
  oneLiner: string;
  mission: string;
  employees: CaseEmployee[];
  sampleTask: {
    title: string;
    description: string;
    presetResult: string;
  };
  youtube: YoutubeRef[];
}

export const CASES: CaseTemplate[] = [
  {
    id: "ai-insta-influencer",
    company: "Solo Influencer Inc.",
    emoji: "📸",
    oneLiner: "AI Instagram influencer studio",
    mission: "Post daily + auto-reply DMs → sponsorship revenue",
    employees: [
      {
        role: "CEO",
        name: "Mina",
        bio: "Hi, I'm Mina — CEO of Solo Influencer Inc. I'll keep the team posting daily so brand deals follow.",
      },
      {
        role: "Content Designer",
        name: "Jay",
        bio: "I own the visuals. Modern minimal tone, consistent across every post.",
      },
      {
        role: "Caption Writer",
        name: "Eun",
        bio: "Captions, hashtags, DM replies — all written so they sound like a real person.",
      },
    ],
    sampleTask: {
      title: "3 Instagram captions + hashtags for a café this week",
      description: "Draft 3 captions for new café menu posts. Warm and friendly tone.",
      presetResult: `**Post 1 — Spring Cherry Blossom Latte**
☕️ The moment spring touches your lips. One spoon of cherry-blossom syrup turns this latte pink — only this week. Maybe a tiny spring break this afternoon? #SpringMenu #CherryBlossomLatte #CaféMoment #TodayInCoffee #SpringDrink

**Post 2 — Weekend Brunch Set**
🥐 A brunch set for the Saturday you slept in. Croissant + eggs benedict + drip coffee. We'll handle the first bite of your weekend. #WeekendBrunch #BrunchSpot #EggsBenedict #CaféRecs #WeekendVibes

**Post 3 — New Signature Dessert**
🍰 Dark chocolate ganache that melts in one bite. Our new signature dessert just dropped — perfect pairing for a deeper cup. #SignatureDessert #ChocolateCake #DessertCafé #NewMenu #SweetAfternoon`,
    },
    youtube: [
      { title: "Solo creator hits $5k/mo with AI on Instagram", url: "https://www.youtube.com/results?search_query=ai+instagram+influencer+automation+revenue" },
      { title: "How 1-person studios run AI staff", url: "https://www.youtube.com/results?search_query=ai+influencer+studio+how+to" },
    ],
  },
  {
    id: "ai-blog-seo",
    company: "Passive Income LLC",
    emoji: "📝",
    oneLiner: "AI blog SEO farm",
    mission: "Ship 5 SEO articles/week → AdSense + affiliate revenue",
    employees: [
      {
        role: "CEO",
        name: "Hyun",
        bio: "Hi, I'm Hyun — CEO of Passive Income LLC. We run keyword research → article publishing 5 times a week, no gaps.",
      },
      {
        role: "SEO Strategist",
        name: "Tara",
        bio: "I prioritize keywords by search volume and competition. 6-month plans are my thing.",
      },
      {
        role: "Content Writer",
        name: "Sangwoo",
        bio: "Give me a keyword, I'll write a 1,500–2,500 word SEO piece that reads like a human did it. Clean citations.",
      },
    ],
    sampleTask: {
      title: "One SEO article for the keyword 'Notion templates'",
      description: "2,000-word SEO article + meta description, beginner-friendly.",
      presetResult: `# Notion Templates — 7 Picks Beginners Can Use Today

Want one place to manage work and life in Notion, but staring at a blank page feels impossible? This post rounds up 7 Notion templates you can drop in and start using right away — with first-hand notes on which one fits which situation.

## 1. Daily Work Tracker
A card-based template that splits your day into morning/afternoon/evening columns. Great for days when you don't know where to start…

## 2. Weekly Review
A 15-minute Sunday-evening retrospective. Just three columns — "what went well", "what didn't", "next week" — much lighter than journaling…

(rest of the article, ~1,800 words — preview cut)

**Meta description**: Hand-picked Notion templates for beginners with real-world notes — daily tracker, weekly review, reading log, and more.`,
    },
    youtube: [
      { title: "AI blog hitting $2k/mo (real case)", url: "https://www.youtube.com/results?search_query=ai+seo+blog+passive+income" },
      { title: "Automating an SEO blog step-by-step", url: "https://www.youtube.com/results?search_query=ai+seo+blog+automation+step+by+step" },
    ],
  },
  {
    id: "ai-newsletter",
    company: "Newsletter Empire",
    emoji: "✉️",
    oneLiner: "AI email newsletter studio",
    mission: "Two newsletters per week → ad slots + paid subs",
    employees: [
      {
        role: "CEO",
        name: "Soo",
        bio: "Hi, I'm Soo — CEO of Newsletter Empire. Topic research to send, twice a week, on rails.",
      },
      {
        role: "Content Curator",
        name: "Min",
        bio: "I gather the week's signal and arrange it into a flow you can read in one sitting.",
      },
      {
        role: "Email Designer",
        name: "Jin",
        bio: "Email layout, CTA placement — readability on mobile is the whole game.",
      },
    ],
    sampleTask: {
      title: "This week's AI automation newsletter (1 issue)",
      description: "Curate 5 AI automation news items + short insight + 1 CTA.",
      presetResult: `**Subject**: 5 things that actually changed in AI automation this week

Hi, thanks for sticking with *Newsletter Empire* this week. Here are the 5 stories that actually moved how teams work — nothing else.

1. **Anthropic Managed Agents GA** — Companies bring their system prompt; Anthropic runs everything else. *Why it matters*: 0 lines of infra for a 24/7 agent. Smaller teams feel this first.
2. **OpenAI Codex CLI 1.0** — Non-interactive code automation. Real self-coding in CI. *Why it matters*: One developer effectively becomes a full-stack team.
3. (3 more items — preview cut)

—

This week's one-liner: **"Bring intent, leave infra behind."**

[👉 Read the full issue / Inquire about ads]`,
    },
    youtube: [
      { title: "10k subs → $1.5k/mo newsletter", url: "https://www.youtube.com/results?search_query=newsletter+monetization+10k+subscribers" },
      { title: "Automating a 2x/week newsletter with AI", url: "https://www.youtube.com/results?search_query=ai+newsletter+automation" },
    ],
  },
  {
    id: "ai-shorts",
    company: "Shorts Factory",
    emoji: "🎬",
    oneLiner: "AI shorts / reels production",
    mission: "3 shorts/day → ad revenue + channel growth",
    employees: [
      {
        role: "CEO",
        name: "Beom",
        bio: "Hi, I'm Beom — CEO of Shorts Factory. Trends → script → captions, one cycle, every single day.",
      },
      {
        role: "Trend Scout",
        name: "Nara",
        bio: "I monitor today's trending keywords, hashtags and BGM every 30 minutes.",
      },
      {
        role: "Video Scripter",
        name: "Doori",
        bio: "15–60 second scripts are my craft. The first 3-second hook is where I shine.",
      },
    ],
    sampleTask: {
      title: "3 trend-based short scripts for this week",
      description: "Three 15–30s shorts on IT/productivity trends. Hook / body / CTA labeled.",
      presetResult: `**Short 1 — "3 things faster than ChatGPT"** (20s)
[Hook 3s] "If you haven't used ChatGPT, you sleep nervous. But these 3 things are faster."
[Body 14s] 1) A sidebar you call with one shortcut, 2) voice input + instant answer, 3) a lighter model bound to a hotkey.
[CTA 3s] "Drop 'AI' in the comments — I'll send you the shortcut pack."

**Short 2 — "Using AI at work without getting caught"** (25s)
[Hook] "Your company bans AI? Here's how nobody notices."
[Body] 1) Local LLM, 2) don't actually bypass policy — use company-approved tools first, 3) keep prompts off shared screens.
[CTA] "Follow + bell = one AI tip every morning before work."

**Short 3 — "The reason you'll regret skipping notes in your 30s"** (28s)
[Hook] "In your 30s, you really regret not taking notes."
[Body] Recall accuracy + decision consistency + your own life-review data — three reasons.
[CTA] "Try one line today. Drop it in the comments and I'll reply."`,
    },
    youtube: [
      { title: "Shorts automation grew this channel to 100k", url: "https://www.youtube.com/results?search_query=ai+shorts+automation+channel+growth" },
      { title: "Make 3 AI shorts every day", url: "https://www.youtube.com/results?search_query=ai+shorts+automation+daily" },
    ],
  },
  {
    id: "ai-cs-bot",
    company: "CS Bot Co.",
    emoji: "💬",
    oneLiner: "AI customer-support outsourcing",
    mission: "Auto-reply chat & email tickets → outsourced CS revenue",
    employees: [
      {
        role: "CEO",
        name: "Hana",
        bio: "Hi, I'm Hana — CEO of CS Bot Co. We cover small shops' customer support 24/7 so the owner sleeps.",
      },
      {
        role: "CS Manager",
        name: "Joon",
        bio: "I own tone, refund policy and the buckets we route repeat questions into.",
      },
      {
        role: "Email Responder",
        name: "Vi",
        bio: "Every email reply reads like a person wrote it. Polite, accurate, concise — that's the rule.",
      },
    ],
    sampleTask: {
      title: "Draft a reply to a refund request email",
      description: "Customer email asking for a refund. Friendly but inside policy (within 7 days, receipt photo).",
      presetResult: `**To**: the customer

Hi, this is CS Bot Co. — first, sorry for the trouble.

We confirmed your refund request. Our policy refunds in full **within 7 days of purchase, with a photo of the receipt**.

You're on day 5, so you're inside the window. Just reply with the receipt photo and we'll process the refund right away. If you lost the receipt, share the last 4 digits of the card you used — we can verify from the transaction.

For faster turnaround, you can also DM our KakaoTalk channel '@csbotco' — replies inside 5 minutes on weekdays, 9am–6pm.

Again, sorry for the inconvenience — we'll get this sorted quickly.

— CS Bot Co.`,
    },
    youtube: [
      { title: "Landing CS contracts with AI", url: "https://www.youtube.com/results?search_query=ai+customer+support+outsourcing+saas" },
      { title: "How a solo founder built an AI CS service", url: "https://www.youtube.com/results?search_query=solo+founder+ai+customer+support+service" },
    ],
  },
];

export function findCase(id: string): CaseTemplate | undefined {
  return CASES.find((c) => c.id === id);
}
