import type { Metadata } from "next";
import Link from "next/link";

import { PreferenceWorkspace } from "../../../preference-workspace";

export const metadata: Metadata = {
  title: "나의 선호",
};

export default async function TripPreferencePage({
  params,
}: Readonly<{ params: Promise<{ tripId: string }> }>) {
  const { tripId } = await params;
  return (
    <main className="min-h-screen bg-canvas px-4 py-8 sm:px-8 lg:py-12">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <Link
            className="font-bold text-[#6f665a] transition hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            href={`/trips/${tripId}`}
          >
            ← 여행 일정
          </Link>
          <div className="flex items-center gap-2">
            <Link
              className="rounded-full border border-line bg-white px-4 py-2 text-sm font-extrabold transition hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              href="/trips"
            >
              내 여행
            </Link>
            <Link
              className="rounded-full border border-line bg-white px-4 py-2 text-sm font-extrabold transition hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              href="/me"
            >
              내 계정
            </Link>
          </div>
        </header>
        <PreferenceWorkspace tripId={tripId} />
      </div>
    </main>
  );
}
