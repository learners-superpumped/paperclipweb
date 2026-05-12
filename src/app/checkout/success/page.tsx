import { Suspense } from "react";
import CheckoutSuccessClient from "./CheckoutSuccessClient";

export const dynamic = "force-dynamic";

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-white px-6">
          <div className="text-gray-500 text-sm">Loading…</div>
        </main>
      }
    >
      <CheckoutSuccessClient />
    </Suspense>
  );
}
