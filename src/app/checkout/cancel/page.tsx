import Link from "next/link";

export default async function CheckoutCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const isDeclined = reason === "declined";

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-6">
      <div className="max-w-md w-full text-center space-y-6" data-testid="cancel-page">
        <div className="text-5xl">{isDeclined ? "🚫" : "↩️"}</div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          {isDeclined ? "Your card was declined" : "Payment cancelled"}
        </h1>

        {isDeclined ? (
          <p
            className="text-gray-600"
            data-testid="decline-error"
          >
            Your card was declined. Try another card or contact your bank.
            Nothing has been charged.
          </p>
        ) : (
          <p className="text-gray-600">
            You cancelled the checkout. No charge was made.
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/checkout"
            className="inline-block rounded-md bg-indigo-600 px-5 py-2.5 text-white text-sm font-medium hover:bg-indigo-700"
            data-testid="try-again-btn"
          >
            Try again →
          </Link>
          <Link
            href="/account"
            className="inline-block rounded-md border border-gray-300 px-5 py-2.5 text-gray-700 text-sm font-medium hover:bg-gray-50"
          >
            Back to account
          </Link>
        </div>
      </div>
    </main>
  );
}
