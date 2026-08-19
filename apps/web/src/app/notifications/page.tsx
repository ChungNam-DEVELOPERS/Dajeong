import type { Metadata } from "next";
import Link from "next/link";

import { NotificationWorkspace } from "../notification-workspace";

export const metadata: Metadata = {
  title: "알림함",
};

export default function NotificationsPage() {
  return (
    <main className="min-h-screen bg-canvas bg-[radial-gradient(circle_at_8%_5%,#fff1bb_0,transparent_25%),radial-gradient(circle_at_92%_90%,#e4f2df_0,transparent_32%)] px-4 py-8 sm:px-8 lg:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <Link className="font-bold text-muted transition hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" href="/trips">← 내 여행</Link>
          <Link className="rounded-full border border-line bg-white/70 px-4 py-2 text-sm font-extrabold transition hover:bg-white" href="/me">내 계정</Link>
        </header>
        <NotificationWorkspace />
      </div>
    </main>
  );
}
