import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AnalyticsProvider } from "@/components/analytics-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "paperclipweb - AI 회사, 바로 시작",
  description:
    "API 키 없이, 청구서 하나로 Paperclip을 운영하세요. 번들 크레딧 포함 원클릭 Paperclip 호스팅.",
  keywords: [
    "paperclip",
    "AI hosting",
    "bundled credits",
    "one bill",
    "AI agents",
  ],
  openGraph: {
    title: "paperclipweb - One bill. One click. Your AI company.",
    description:
      "API 키 없이, 청구서 하나로 Paperclip을 운영하세요.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={inter.variable}>
      <body className="font-sans">
        <AnalyticsProvider>{children}</AnalyticsProvider>
      </body>
    </html>
  );
}
