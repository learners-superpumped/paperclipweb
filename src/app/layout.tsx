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
const SITE_DESCRIPTION_LONG =
  "Hire an AI team and run a business on its own. Clone a YouTube-validated AI company in 5 minutes, then spin up the real instance with one click — bundled actions, real-time balance, top up anytime.";

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
  description: `${SITE_DESCRIPTION} ${SITE_DESCRIPTION_LONG}`,
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
    // Long-tail
    "hire AI employees",
    "AI business cloning",
    "YouTube AI case clone",
    "AI workflow company",
    "AI sole proprietor toolkit",
  ],
  alternates: {
    canonical: SITE_URL,
    languages: {
      en: SITE_URL,
      "x-default": SITE_URL,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Launch Your AI Company. No infra needed.`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "paperclip — Launch Your AI Company. No infra needed.",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Launch Your AI Company. No infra needed.`,
    description:
      "Managed Paperclip hosting with bundled AI credits. Deploy autonomous AI agents in 60 seconds.",
    images: ["/opengraph-image"],
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
  inLanguage: ["en"],
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
          <AnalyticsProvider>
            <main id="main-content">{children}</main>
          </AnalyticsProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
