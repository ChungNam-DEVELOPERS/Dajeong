import type { Metadata } from "next";

import { DetailScreen } from "@/components/dajeong/screens/detail-screen";

export const metadata: Metadata = {
  title: "상세 일정 | 다정",
};

export default function DetailPage() {
  return <DetailScreen />;
}
