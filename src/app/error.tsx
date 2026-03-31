"use client";

import { Button } from "@/components/ui/button";
import { Paperclip, RefreshCw } from "lucide-react";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 mb-8">
          <Paperclip className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold text-secondary-800">paperclipweb</span>
        </div>
        <h1 className="text-4xl font-bold text-secondary-800 mb-4">
          Something went wrong
        </h1>
        <p className="text-lg text-secondary-500 mb-8">
          An unexpected error occurred. Please try again.
        </p>
        <Button onClick={reset} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    </div>
  );
}
