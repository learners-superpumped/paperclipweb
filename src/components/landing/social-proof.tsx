"use client";

import { useEffect, useState } from "react";
import { Star, TrendingUp, Users, Twitter } from "lucide-react";

const TWEETS = [
  {
    author: "@aibuilder",
    handle: "AI Builder",
    text: "Just moved to Paperclip for my startup's AI agents. The bundled credits model is genius -- one bill instead of juggling 4 API keys.",
    avatar: "A",
  },
  {
    author: "@solofounder_kr",
    handle: "Solo Founder",
    text: "Paperclip made it possible to run my entire AI company solo. CEO agent handles market research while I sleep.",
    avatar: "S",
  },
  {
    author: "@devtoolsfan",
    handle: "DevTools Fan",
    text: "Open source, self-hostable, OR managed hosting with paperclipweb. Best of both worlds for AI agent orchestration.",
    avatar: "D",
  },
  {
    author: "@startupkr",
    handle: "Startup KR",
    text: "From zero to AI-powered outbound in 60 seconds. paperclipweb is what I wished existed when I started my SaaS.",
    avatar: "K",
  },
];

export function SocialProof() {
  const [stars, setStars] = useState<number>(0);
  const [growth, setGrowth] = useState<number>(0);
  const [tweetIndex, setTweetIndex] = useState(0);

  useEffect(() => {
    fetch("/api/github/stars")
      .then((r) => r.json())
      .then((d) => {
        setStars(d.stars || 0);
        setGrowth(d.recentGrowth || 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTweetIndex((i) => (i + 1) % TWEETS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const tweet = TWEETS[tweetIndex];

  return (
    <section className="py-16 sm:py-20 border-t border-secondary-100">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* GitHub Stars */}
          <div className="flex flex-col items-center text-center p-6 rounded-xl border border-secondary-200 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              <span className="text-3xl font-bold text-secondary-800">
                {stars > 0 ? stars.toLocaleString() : "--"}
              </span>
            </div>
            <p className="text-sm text-secondary-500">GitHub Stars</p>
            {growth > 0 && (
              <div className="flex items-center gap-1 mt-2 text-xs text-accent">
                <TrendingUp className="h-3 w-3" />
                +{growth.toLocaleString()} this month
              </div>
            )}
          </div>

          {/* Companies running */}
          <div className="flex flex-col items-center text-center p-6 rounded-xl border border-secondary-200 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-3xl font-bold text-secondary-800">150+</span>
            </div>
            <p className="text-sm text-secondary-500">AI Companies Running</p>
            <p className="text-xs text-secondary-400 mt-2">Powered by Paperclip</p>
          </div>

          {/* Twitter mentions carousel */}
          <div className="p-6 rounded-xl border border-secondary-200 bg-white min-h-[160px] flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <Twitter className="h-4 w-4 text-[#1DA1F2]" />
              <span className="text-xs text-secondary-400 font-medium">What people say</span>
            </div>
            <div className="flex-1">
              <p className="text-sm text-secondary-600 leading-relaxed italic">
                &ldquo;{tweet.text}&rdquo;
              </p>
              <div className="flex items-center gap-2 mt-3">
                <div className="h-6 w-6 rounded-full bg-primary-50 flex items-center justify-center text-xs font-bold text-primary">
                  {tweet.avatar}
                </div>
                <span className="text-xs text-secondary-500">{tweet.handle}</span>
              </div>
            </div>
            <div className="flex gap-1 mt-3 justify-center">
              {TWEETS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    i === tweetIndex ? "bg-primary" : "bg-secondary-200"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
