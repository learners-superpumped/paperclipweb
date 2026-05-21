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
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 shadow-md transition group-hover:scale-110">
                <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5 fill-primary" aria-hidden>
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
        className="mt-2 block text-xs leading-snug text-secondary-700 hover:text-primary line-clamp-2"
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
            Watch the real cases — then copy the company with one click.
          </p>
        </div>

        <div className="space-y-6" data-testid="case-grid">
          {cases.map((c) => (
            <article
              key={c.id}
              data-testid={`case-card-${c.id}`}
              className="rounded-2xl border border-secondary-200 bg-white p-6 sm:p-8 flex flex-col lg:flex-row gap-6 lg:gap-8 hover:shadow-lg hover:border-primary/40 transition"
            >
              <div className="lg:w-72 lg:flex-shrink-0 flex flex-col">
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
                <div className="text-xs text-secondary-700 space-y-1 mb-5">
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
                <Link
                  href={`/onboarding/${c.id}`}
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "lg:mt-auto block text-center w-full cursor-pointer",
                  )}
                >
                  Try this template
                </Link>
              </div>

              <div className="flex-1 min-w-0">
                <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-secondary-500">
                  Real cases on YouTube
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {c.youtube.map((y, i) => (
                    <YouTubeCase key={i} url={y.url} title={y.title} />
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
