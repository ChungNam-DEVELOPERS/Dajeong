import type { Metadata } from "next";
import Link from "next/link";

import { MeProfileCard } from "../me-profile-card";

export const metadata: Metadata = {
  title: "내 공간",
};

export default function MePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas bg-[radial-gradient(circle_at_15%_10%,#fff1bb_0,transparent_30%),radial-gradient(circle_at_85%_90%,#e4f2df_0,transparent_34%)] px-4 py-10 sm:px-8">
      <div className="w-full max-w-xl">
        <Link
          className="mb-5 inline-flex font-bold text-muted transition hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          href="/"
        >
          ← 홈으로
        </Link>
        <MeProfileCard />
      </div>
    </main>
  );
}
