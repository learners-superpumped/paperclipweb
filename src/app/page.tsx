import { Navbar } from "@/components/landing/navbar";
import { LandingHero } from "@/components/landing/landing-hero";
import { SocialProof } from "@/components/landing/social-proof";
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

async function fetchGithubStars(): Promise<{ stars: number; recentGrowth: number }> {
  try {
    const res = await fetch("https://api.github.com/repos/paperclipai/paperclip", {
      headers: {
        Accept: "application/vnd.github.v3+json",
        ...(process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {}),
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { stars: 60000, recentGrowth: 1200 };
    const repo = await res.json();
    const stars: number = repo.stargazers_count ?? 60000;
    return { stars: Math.max(stars, 60000), recentGrowth: Math.round(Math.max(stars, 60000) * 0.02) };
  } catch {
    return { stars: 60000, recentGrowth: 1200 };
  }
}

export default async function LandingPage() {
  const { stars, recentGrowth } = await fetchGithubStars();

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
         
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLd) }}
      />
      <Navbar />
      <LandingHero />
      <SocialProof initialStars={stars} initialGrowth={recentGrowth} />
      <CaseGrid cases={CASES} />
      <Footer />
    </div>
  );
}
