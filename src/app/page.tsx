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
    "Clone a YouTube-validated AI business in 5 minutes, then spin up the real instance with one click.",
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
