import type { Metadata } from "next";

import { PreferencesScreen } from "@/components/dajeong/screens/preferences-screen";

export const metadata: Metadata = {
  title: "나의 선호 | 다정",
};

export default function PreferencesPage() {
  return <PreferencesScreen />;
}
