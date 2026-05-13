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
        "Your card was declined. Try another card or contact your bank.",
      );
      return;
    }
    if (normalized !== SUCCESS_CARD) {
      setError(
        "Please check your card details. (Mock mode accepts 4242 4242 4242 4242 for success.)",
      );
      return;
    }
    if (!/^\d{2}\s?\/\s?\d{2}$/.test(expiry)) {
      setError("Enter expiry as MM/YY.");
      return;
    }
    if (!/^\d{3,4}$/.test(cvc)) {
      setError("CVC must be 3–4 digits.");
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
        setError(data.error ?? "Payment failed. Please try again.");
        setLoading(false);
        return;
      }
      router.push(`/provisioning?session_id=mock_${data.slug}&caseId=${encodeURIComponent(caseId ?? "")}`);
    } catch {
      setError("Payment failed. Please try again.");
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
        <Lock className="h-3 w-3" /> Secure checkout — mock mode (no real charge)
      </div>
      <div>
        <label
          htmlFor="card"
          className="block text-sm font-medium text-secondary-800 mb-1.5"
        >
          Card number
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
        <p className="mt-1 text-[11px] text-secondary-700">
          Test cards: 4242 4242 4242 4242 (success) · 4000 0000 0000 0002 (declined)
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="expiry"
            className="block text-sm font-medium text-secondary-800 mb-1.5"
          >
            Expiry (MM/YY)
          </label>
          <Input
            id="expiry"
            placeholder="MM/YY"
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
            name="cvc"
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
          "Pay $29"
        )}
      </Button>

      <p className="text-[11px] text-secondary-700 text-center">
        After payment, the real instance spins up automatically and everything you built in the mock carries over.
      </p>
    </form>
  );
}
