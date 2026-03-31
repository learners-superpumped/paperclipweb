"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X, Paperclip } from "lucide-react";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-secondary-200/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 cursor-pointer">
            <Paperclip className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold text-secondary-800">
              paperclipweb
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm text-secondary-500 hover:text-secondary-800 transition-colors duration-200 cursor-pointer"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-sm text-secondary-500 hover:text-secondary-800 transition-colors duration-200 cursor-pointer"
            >
              Pricing
            </a>
            <a
              href="https://github.com/learners-superpumped/paperclipweb"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-secondary-500 hover:text-secondary-800 transition-colors duration-200 cursor-pointer"
            >
              GitHub
            </a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>

          <button
            className="md:hidden p-2 cursor-pointer"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? (
              <X className="h-5 w-5 text-secondary-700" />
            ) : (
              <Menu className="h-5 w-5 text-secondary-700" />
            )}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden pb-4 pt-2 border-t border-secondary-100">
            <div className="flex flex-col gap-3">
              <a
                href="#features"
                className="px-3 py-2 text-sm text-secondary-600 hover:text-secondary-800 cursor-pointer"
                onClick={() => setMobileOpen(false)}
              >
                Features
              </a>
              <a
                href="#pricing"
                className="px-3 py-2 text-sm text-secondary-600 hover:text-secondary-800 cursor-pointer"
                onClick={() => setMobileOpen(false)}
              >
                Pricing
              </a>
              <div className="flex gap-2 px-3 pt-2">
                <Link href="/login" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    Log in
                  </Button>
                </Link>
                <Link href="/signup" className="flex-1">
                  <Button size="sm" className="w-full">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
