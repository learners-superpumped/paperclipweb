"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Lock } from "lucide-react";

const SUCCESS_CARD = "4242424242424242";
const DECLINED_CARD = "4000000000000002";

function normalizeCard(v: string): string {
  return v.replace(/\D/g, "");
}

export function MockCheckoutForm({ caseId }: { caseId: string | null }) {
  const router = useRouter();
  const [card, setCard] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const normalized = normalizeCard(card);

    if (normalized === DECLINED_CARD) {
      setError(
        "카드가 거절됐습니다. 다른 카드로 시도하시거나 카드사에 문의해주세요.",
      );
      return;
    }
    if (normalized !== SUCCESS_CARD) {
      setError(
        "카드 정보를 확인해주세요. (mock 결제 모드에서는 4242 4242 4242 4242 만 결제가 진행됩니다)",
      );
      return;
    }
    if (!/^\d{2}\s?\/\s?\d{2}$/.test(expiry)) {
      setError("만료일을 MM/YY 형식으로 입력해주세요.");
      return;
    }
    if (!/^\d{3,4}$/.test(cvc)) {
      setError("CVC 를 3~4자리 숫자로 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/checkout/mock-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        slug?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "결제 처리에 실패했어요. 잠시 후 다시 시도해주세요.");
        setLoading(false);
        return;
      }
      router.push(`/i/${data.slug}?just_paid=1`);
    } catch {
      setError("결제 처리에 실패했어요. 잠시 후 다시 시도해주세요.");
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handlePay}
      className="rounded-2xl border border-secondary-200 bg-white p-6 space-y-4"
      data-testid="mock-checkout-form"
    >
      <div className="flex items-center gap-2 text-xs text-secondary-700 mb-1">
        <Lock className="h-3 w-3" /> 안전한 결제 — mock 모드 (실제 결제 X)
      </div>
      <div>
        <label
          htmlFor="card"
          className="block text-sm font-medium text-secondary-800 mb-1.5"
        >
          카드 번호
        </label>
        <Input
          id="card"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="4242 4242 4242 4242"
          value={card}
          onChange={(e) => setCard(e.target.value)}
          data-testid="card-number"
          required
        />
        <p className="mt-1 text-[11px] text-secondary-600">
          테스트 카드: 4242 4242 4242 4242 (성공) · 4000 0000 0000 0002 (실패)
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="expiry"
            className="block text-sm font-medium text-secondary-800 mb-1.5"
          >
            만료일 (MM/YY)
          </label>
          <Input
            id="expiry"
            placeholder="12/30"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            data-testid="card-expiry"
            required
          />
        </div>
        <div>
          <label
            htmlFor="cvc"
            className="block text-sm font-medium text-secondary-800 mb-1.5"
          >
            CVC
          </label>
          <Input
            id="cvc"
            placeholder="123"
            value={cvc}
            onChange={(e) => setCvc(e.target.value)}
            data-testid="card-cvc"
            required
          />
        </div>
      </div>

      {error && (
        <div
          className="rounded-lg border border-destructive/30 bg-destructive-50 p-3 text-sm text-destructive"
          data-testid="checkout-error"
        >
          {error}
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={loading}
        data-testid="pay-btn"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          "$29 결제하기"
        )}
      </Button>

      <p className="text-[11px] text-secondary-600 text-center">
        결제 후 자동으로 진짜 인스턴스가 활성됩니다. mock 에서 만드신 게 그대로
        옮겨갑니다.
      </p>
    </form>
  );
}
