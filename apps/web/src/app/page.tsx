import Link from "next/link";

import { SystemHealthCard } from "./system-health-card";

const foundationItems = [
  { label: "Routing", value: "App Router" },
  { label: "Quality", value: "Lint · Typecheck" },
  { label: "Theme", value: "Shared tokens" },
] as const;

export default function HomePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas bg-[radial-gradient(circle_at_8%_14%,#fff1bb_0,transparent_27%),radial-gradient(circle_at_92%_88%,#e4f2df_0,transparent_31%)] px-[var(--space-md)] py-[var(--space-lg)] sm:p-[clamp(var(--space-lg),6vw,72px)]">
      <div className="grid w-full max-w-[1120px] items-center gap-[var(--space-xl)] lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)] lg:gap-[clamp(var(--space-xl),5vw,72px)]">
        <section className="py-[var(--space-xl)]" aria-labelledby="home-title">
          <div className="inline-flex items-center gap-[var(--space-xs)] rounded-full border border-[#cfe3c9] bg-[#eff8ec] px-3 py-2 text-xs font-extrabold tracking-[0.08em] text-brand-strong uppercase">
            <span
              className="size-2 rounded-full bg-brand shadow-[0_0_0_4px_rgb(91_159_90_/_14%)]"
              aria-hidden="true"
            />
            Web journey ready
          </div>

          <p className="mt-[var(--space-xl)] mb-[var(--space-sm)] text-[clamp(1rem,2vw,1.2rem)] font-bold text-muted">
            좋아하는 사람들과 함께
          </p>
          <h1
            id="home-title"
            className="m-0 max-w-[720px] text-[clamp(2.8rem,15vw,4.25rem)] leading-[0.98] font-black tracking-[-0.065em] text-balance sm:text-[clamp(3.25rem,8vw,6.5rem)]"
          >
            여행의 모든 시간을
            <span className="block text-brand">다정하게.</span>
          </h1>
          <p className="mt-[var(--space-lg)] max-w-[600px] text-[clamp(1rem,1.7vw,1.15rem)] leading-7 text-muted [word-break:keep-all]">
            계획부터 추억까지, 소중한 사람들과 나눌 수 있는 여행 공간을
            만들고 있어요.
          </p>

          <div className="mt-[var(--space-xl)] flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand px-6 py-3 font-extrabold text-white transition hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              href="/trips"
            >
              내 여행 시작하기
            </Link>
            <Link
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line bg-white/70 px-6 py-3 font-extrabold transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              href="/me"
            >
              내 계정 확인하기
            </Link>
          </div>

          <dl
            className="mt-[var(--space-xl)] grid max-w-[660px] grid-cols-1 gap-[var(--space-sm)] sm:mt-[var(--space-xxl)] sm:grid-cols-3"
            aria-label="웹 기반 구성"
          >
            {foundationItems.map(({ label, value }) => (
              <div
                className="rounded-[18px] border border-line bg-white/70 p-[var(--space-md)] backdrop-blur-sm"
                key={label}
              >
                <dt className="text-xs font-bold tracking-[0.04em] text-muted uppercase">
                  {label}
                </dt>
                <dd className="mt-1.5 text-[0.95rem] font-extrabold">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <SystemHealthCard />
      </div>
    </main>
  );
}
