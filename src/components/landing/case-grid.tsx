"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import type { CaseTemplate } from "@/lib/cases";

function youtubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  return m ? m[1] : null;
}

/**
 * A YouTube case rendered as a thumbnail facade. Clicking the thumbnail swaps
 * in the real player inline — no iframe is loaded until the user asks for it,
 * so the landing page stays fast.
 */
function YouTubeCase({ url, title }: { url: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  const id = youtubeId(url);

  if (!id) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-secondary-700 underline decoration-secondary-300 hover:decoration-primary"
      >
        ▶ {title}
      </a>
    );
  }

  return (
    <div>
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-secondary-100">
        {playing ? (
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
            title={title}
            loading="lazy"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={`Play video: ${title}`}
            className="group absolute inset-0 h-full w-full cursor-pointer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`}
              alt={title}
              loading="lazy"
              className="h-full w-full object-cover transition group-hover:scale-[1.04]"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/15 transition group-hover:bg-black/25">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-md">
                <svg viewBox="0 0 24 24" className="ml-0.5 h-3.5 w-3.5 fill-primary" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </span>
          </button>
        )}
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 block text-[11px] leading-snug text-secondary-700 hover:text-primary line-clamp-2"
      >
        {title}
      </a>
    </div>
  );
}

export function CaseGrid({ cases }: { cases: CaseTemplate[] }) {
  return (
    <section className="py-16 sm:py-24 bg-secondary-50/40" id="cases">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-secondary-800">
            5 AI businesses people actually built on YouTube
          </h2>
          <p className="mt-3 text-secondary-700">
            Try the template first. Launch the real company only when it feels right.
          </p>
        </div>

        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          data-testid="case-grid"
        >
          {cases.map((c) => (
            <article
              key={c.id}
              data-testid={`case-card-${c.id}`}
              className="rounded-2xl border border-secondary-200 bg-white p-6 flex flex-col hover:shadow-lg hover:border-primary/40 transition"
            >
              <div className="text-3xl mb-3" aria-hidden>
                {c.emoji}
              </div>
              <div className="text-xs font-medium text-primary uppercase tracking-wide mb-1">
                {c.oneLiner}
              </div>
              <div className="text-lg font-semibold text-secondary-800 mb-2">
                {c.company}
              </div>
              <div className="text-sm text-secondary-700 mb-3">
                {c.mission}
              </div>
              <div className="text-xs text-secondary-700 space-y-1 mb-4">
                <div>
                  <span className="font-medium text-secondary-800">Team</span>:{" "}
                  {c.employees.map((e) => e.role).join(", ")}
                </div>
                <div>
                  <span className="font-medium text-secondary-800">
                    Sample task
                  </span>
                  : {c.sampleTask.title}
                </div>
              </div>
              <div className="mt-auto space-y-2">
                <Link
                  href={`/onboarding/${c.id}`}
                  className={cn(buttonVariants({ size: "sm" }), "block text-center w-full cursor-pointer")}
                >
                  Try this template
                </Link>
                <div className="space-y-2 pt-2 border-t border-secondary-100">
                  <div className="text-[11px] text-secondary-700">
                    YouTube cases
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {c.youtube.map((y, i) => (
                      <YouTubeCase key={i} url={y.url} title={y.title} />
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
