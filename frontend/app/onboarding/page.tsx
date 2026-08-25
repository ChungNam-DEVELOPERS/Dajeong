import type { Metadata } from "next";

import { OnboardingScreen } from "@/components/dajeong/screens/onboarding-screen";

export const metadata: Metadata = {
  title: "온보딩 | 다정",
};

export default function OnboardingPage() {
  return <OnboardingScreen />;
}
