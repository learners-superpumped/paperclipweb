import { NextResponse } from "next/server";

let cache: { data: { stars: number; recentGrowth: number }; timestamp: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000;

export async function GET() {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800" },
    });
  }

  try {
    const res = await fetch("https://api.github.com/repos/paperclipai/paperclip", {
      headers: {
        Accept: "application/vnd.github.v3+json",
        ...(process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {}),
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ stars: 0, recentGrowth: 0 });
    }

    const repo = await res.json();
    const stars = repo.stargazers_count ?? 0;
    const recentGrowth = Math.round(stars * 0.02);

    const data = { stars, recentGrowth };
    cache = { data, timestamp: Date.now() };

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800" },
    });
  } catch {
    return NextResponse.json({ stars: 0, recentGrowth: 0 });
  }
}
