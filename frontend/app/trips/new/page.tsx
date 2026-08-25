import type { Metadata } from "next";

import { CreateTripScreen } from "@/components/dajeong/screens/create-trip-screen";

export const metadata: Metadata = {
  title: "새 여행 만들기 | 다정",
};

export default function CreateTripPage() {
  return <CreateTripScreen />;
}
