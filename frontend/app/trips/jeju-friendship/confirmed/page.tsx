import type { Metadata } from "next";

import { ConfirmedScreen } from "@/components/dajeong/screens/confirmed-screen";

export const metadata: Metadata = {
  title: "일정 확정 | 다정",
};

export default function ConfirmedPage() {
  return <ConfirmedScreen />;
}
