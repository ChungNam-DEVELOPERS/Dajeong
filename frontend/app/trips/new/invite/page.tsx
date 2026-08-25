import type { Metadata } from "next";

import { InviteScreen } from "@/components/dajeong/screens/invite-screen";

export const metadata: Metadata = {
  title: "멤버 초대 | 다정",
};

export default function InvitePage() {
  return <InviteScreen />;
}
