import { Navbar } from "@/components/landing/navbar";
import { LandingHero } from "@/components/landing/landing-hero";
import { CaseGrid } from "@/components/landing/case-grid";
import { Footer } from "@/components/landing/footer";
import { CASES } from "@/lib/cases";

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://usepaperclip.app";

const softwareLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "paperclip",
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "AI Agent Orchestration Hosting",
  operatingSystem: "Web",
  description:
    "유튜브에서 본 AI 자동화 회사를 5분 만에 따라 만들고, 결제 한 번에 진짜 인스턴스를 띄우세요.",
  url: SITE_URL,
  image: `${SITE_URL}/og.png`,
};

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLd) }}
      />
      <Navbar />
      <LandingHero />
      <CaseGrid cases={CASES} />
      <Footer />
    </div>
  );
}
