import { ProvisioningClient } from "./provisioning-client";

export default async function ProvisioningPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; caseId?: string }>;
}) {
  const { session_id, caseId } = await searchParams;
  return <ProvisioningClient sessionId={session_id ?? ""} caseId={caseId ?? ""} />;
}
