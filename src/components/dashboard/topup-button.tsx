"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { TOPUP } from "@/lib/constants";

export function TopUpButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTopUp = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/checkout/mock-topup", {
        method: "POST",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "충전에 실패했어요.");
        setLoading(false);
        return;
      }
      router.refresh();
      setLoading(false);
    } catch {
      setError("충전에 실패했어요.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        size="lg"
        className="w-full"
        onClick={handleTopUp}
        disabled={loading}
        data-testid="topup-btn"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          `${TOPUP.credits} 액션 충전하기 ($${TOPUP.price})`
        )}
      </Button>
      {error && (
        <div className="text-sm text-destructive" data-testid="topup-error">
          {error}
        </div>
      )}
    </div>
  );
}
