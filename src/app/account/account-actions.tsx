"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, CreditCard, XCircle, RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AccountActions({
  instanceUrl,
  hasActiveCompany,
}: {
  instanceUrl: string | null;
  hasActiveCompany: boolean;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleTopUp() {
    setLoading("topup");
    try {
      const res = await fetch("/api/checkout/topup", { method: "POST" });
      const data = await res.json() as { url?: string };
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(null);
    }
  }

  async function handleChangeCard() {
    setLoading("card");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json() as { url?: string };
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(null);
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel your subscription? Your company stays active for 30 days.")) return;
    setLoading("cancel");
    try {
      const res = await fetch("/api/subscription/cancel", { method: "POST" });
      const data = await res.json() as { ok?: boolean };
      if (data.ok) window.location.reload();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3 pt-2 border-t border-secondary-100">
      {hasActiveCompany && instanceUrl ? (
        <a
          href={instanceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 w-full justify-center rounded-lg bg-primary text-white px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition"
          data-testid="open-paperclip-btn"
        >
          <ExternalLink className="h-4 w-4" />
          Open my paperclip
        </a>
      ) : (
        <Link
          href="/"
          className="flex items-center gap-2 w-full justify-center rounded-lg border border-primary text-primary px-4 py-2.5 text-sm font-medium hover:bg-primary/5 transition"
          data-testid="resubscribe-btn"
        >
          <RotateCcw className="h-4 w-4" />
          Re-subscribe
        </Link>
      )}

      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2"
        onClick={handleTopUp}
        disabled={loading === "topup"}
        data-testid="topup-btn"
      >
        <RefreshCw className="h-4 w-4" />
        {loading === "topup" ? "Redirecting…" : "Top up $10"}
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2"
        onClick={handleChangeCard}
        disabled={loading === "card"}
        data-testid="change-card-btn"
      >
        <CreditCard className="h-4 w-4" />
        {loading === "card" ? "Redirecting…" : "Change card"}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="w-full gap-2 text-secondary-500 hover:text-red-600"
        onClick={handleCancel}
        disabled={loading === "cancel"}
        data-testid="cancel-btn"
      >
        <XCircle className="h-4 w-4" />
        {loading === "cancel" ? "Cancelling…" : "Cancel subscription"}
      </Button>
    </div>
  );
}
