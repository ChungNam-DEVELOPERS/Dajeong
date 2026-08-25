import type { Metadata } from "next";

import { RecommendationsScreen } from "@/components/dajeong/screens/recommendations-screen";

export const metadata: Metadata = {
  title: "AI 일정 추천 | 다정",
};

export default function RecommendationsPage() {
  return <RecommendationsScreen />;
}
