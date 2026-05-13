import SignupForm from "./SignupForm";

// Server component — reads searchParams on the server so the full form
// (including Name input) is present in the initial SSR HTML, avoiding the
// hydration-gap that caused QA to miss the Name field (2.M1).
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ case?: string }>;
}) {
  const params = await searchParams;
  const caseId = params.case ?? null;
  return <SignupForm caseId={caseId} />;
}
