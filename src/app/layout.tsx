import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { SessionProvider } from "@/components/session-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://usepaperclip.app";
const SITE_NAME = "paperclipweb";
const SITE_TAGLINE = "Run your AI company with one bill";
const SITE_DESCRIPTION =
  "paperclipweb is managed Paperclip hosting with bundled AI credits. One bill, one click, your AI company — deploy autonomous AI agents in 60 seconds without juggling Anthropic, OpenAI, or Railway bills.";
const SITE_DESCRIPTION_KO =
  "paperclipweb는 번들 AI 크레딧이 포함된 매니지드 Paperclip 호스팅입니다. 하나의 청구서, 한 번의 클릭으로 AI 회사를 60초 만에 배포하세요. Anthropic, OpenAI, Railway 요금을 따로 관리할 필요가 없습니다.";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: `${SITE_DESCRIPTION} ${SITE_DESCRIPTION_KO}`,
  applicationName: SITE_NAME,
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  authors: [{ name: "paperclipweb", url: SITE_URL }],
  creator: "paperclipweb",
  publisher: "paperclipweb",
  category: "technology",
  keywords: [
    // English — product
    "paperclipweb",
    "paperclip",
    "paperclip hosting",
    "managed paperclip",
    "AI company",
    "AI company hosting",
    "AI agent platform",
    "autonomous AI agents",
    "AI agents hosting",
    "one bill AI",
    "bundled AI credits",
    "AI credits subscription",
    "Anthropic credits",
    "OpenAI credits",
    "Claude API credits",
    "AI infrastructure",
    "managed AI hosting",
    "agent runtime",
    "agent platform",
    "AI startup tools",
    "AI SaaS",
    "Railway alternative for AI",
    "deploy AI agents",
    "AI agent deployment",
    "no API keys",
    "AI agent dashboard",
    "AI ops",
    "AI billing",
    // Korean — product
    "페이퍼클립",
    "페이퍼클립웹",
    "AI 회사",
    "AI 에이전트",
    "AI 에이전트 호스팅",
    "AI 에이전트 플랫폼",
    "자율 AI 에이전트",
    "AI 크레딧",
    "AI 크레딧 번들",
    "Anthropic 크레딧",
    "OpenAI 크레딧",
    "Claude 크레딧",
    "AI 인프라",
    "AI 매니지드 호스팅",
    "AI 청구서",
    "AI 통합 결제",
    "AI 스타트업",
    "AI 에이전트 배포",
    "API 키 없이",
    "AI 대시보드",
    "AI 운영",
    "AI SaaS",
    "Railway 대안",
  ],
  alternates: {
    canonical: SITE_URL,
    languages: {
      en: SITE_URL,
      ko: SITE_URL,
      "x-default": SITE_URL,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: ["ko_KR"],
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — One bill. One click. Your AI company.`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "paperclipweb — Managed Paperclip hosting with bundled AI credits",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — One bill. One click. Your AI company.`,
    description:
      "Managed Paperclip hosting with bundled AI credits. Deploy autonomous AI agents in 60 seconds.",
    images: ["/og.png"],
    creator: "@paperclipweb",
    site: "@paperclipweb",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
  manifest: "/manifest.webmanifest",
  verification: {
    google: "70bb19478c2788a6",
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/icon.svg`,
  description: SITE_DESCRIPTION,
  sameAs: [
    "https://github.com/learners-superpumped",
    "https://twitter.com/paperclipweb",
  ],
};

const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  inLanguage: ["en", "ko"],
  publisher: {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
  },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
        />
      </head>
      <body className="font-sans">
        <SessionProvider>
          <AnalyticsProvider>{children}</AnalyticsProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
