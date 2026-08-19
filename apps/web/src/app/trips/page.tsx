import type { Metadata } from "next";
import Link from "next/link";

import { TripsWorkspace } from "../trips-workspace";

export const metadata: Metadata = {
  title: "내 여행",
};

export default function TripsPage() {
  return (
    <main className="min-h-screen bg-canvas bg-[radial-gradient(circle_at_8%_5%,#fff1bb_0,transparent_25%),radial-gradient(circle_at_92%_90%,#e4f2df_0,transparent_32%)] px-4 py-8 sm:px-8 lg:py-12">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <Link
            className="font-bold text-muted transition hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            href="/"
          >
            ← 홈으로
          </Link>
          <div className="flex items-center gap-2">
            <Link className="rounded-full border border-brand bg-[#edf7ea] px-4 py-2 text-sm font-extrabold text-brand-strong transition hover:bg-white" href="/notifications">알림함</Link>
            <Link className="rounded-full border border-line bg-white/70 px-4 py-2 text-sm font-extrabold transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" href="/me">내 계정</Link>
          </div>
        </header>
        <TripsWorkspace />
      </div>
    </main>
  );
}
