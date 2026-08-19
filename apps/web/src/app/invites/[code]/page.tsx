import type { Metadata } from "next";

import { InviteJoinCard } from "../../invite-join-card";

export const metadata: Metadata = {
  title: "여행 초대",
};

type InvitePageProps = {
  params: Promise<{ code: string }>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { code } = await params;

  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4 py-10 sm:px-8">
      <InviteJoinCard code={code} />
    </main>
  );
}
