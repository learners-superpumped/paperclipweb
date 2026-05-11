import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { findCase } from "@/lib/cases";
import { MockCheckoutForm } from "@/components/checkout/mock-checkout-form";
import { PLANS, TOPUP } from "@/lib/constants";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ case?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const { case: caseId } = await searchParams;
  const template = caseId ? findCase(caseId) : undefined;

  return (
    <div className="min-h-screen bg-secondary-50/40 py-12 px-4">
      <div className="mx-auto max-w-xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-secondary-800">
            Pay and spin up the real company
          </h1>
          <p className="mt-2 text-sm text-secondary-700">
            Everything you built in the mock — company, team, first task — moves into the real instance.
          </p>
        </div>

        <div
          className="rounded-2xl border border-secondary-200 bg-white p-6 mb-6"
          data-testid="order-summary"
        >
          <h2 className="text-sm font-semibold text-secondary-800 mb-3">
            Order summary
          </h2>
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-secondary-800 font-medium">
                Pro subscription (billed monthly)
              </div>
              <div className="text-xs text-secondary-700">
                {PLANS.pro.credits} actions + 1 instance + email alerts
              </div>
            </div>
            <div className="text-2xl font-bold text-secondary-800">
              ${PLANS.pro.price}
              <span className="text-sm text-secondary-700 font-normal">/mo</span>
            </div>
          </div>
          {template && (
            <div className="mt-4 rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm text-secondary-700">
              <span className="text-xs text-primary font-medium mr-2">
                Carrying over
              </span>
              {template.emoji} {template.company} — everything you built in the mock moves into the real instance
            </div>
          )}
          <div className="mt-3 text-xs text-secondary-700">
            Need more actions? Top up later from the dashboard — ${TOPUP.price} for {TOPUP.credits} actions.
          </div>
        </div>

        <MockCheckoutForm caseId={caseId ?? null} />
      </div>
    </div>
  );
}
