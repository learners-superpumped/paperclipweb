import { redirect } from "next/navigation";

export default function OnboardingIndex() {
  // 케이스 미선택 진입 → 케이스 선택 화면으로
  redirect("/cases");
}
