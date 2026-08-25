import type { Metadata } from "next";

import { VoteScreen } from "@/components/dajeong/screens/vote-screen";

export const metadata: Metadata = {
  title: "일정 투표 | 다정",
};

export default function VotePage() {
  return <VoteScreen />;
}
