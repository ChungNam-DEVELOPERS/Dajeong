const foundationItems = [
  { label: "Routing", value: "App Router" },
  { label: "Quality", value: "Lint · Typecheck" },
  { label: "Theme", value: "Shared tokens" },
] as const;

const readinessItems = [
  "Server Component 기본 구조",
  "공통 TypeScript·ESLint 규칙",
  "반응형 최소 홈 화면",
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
            Web foundation ready
          </div>

          <p className="mt-[var(--space-xl)] mb-[var(--space-sm)] text-[clamp(1rem,2vw,1.2rem)] font-bold text-muted">
            소중한 사람들과 함께
          </p>
          <h1
            id="home-title"
            className="m-0 max-w-[720px] text-[clamp(2.8rem,15vw,4.25rem)] leading-[0.98] font-black tracking-[-0.065em] text-balance sm:text-[clamp(3.25rem,8vw,6.5rem)]"
          >
            여행의 모든 순간을
            <span className="block text-brand">다정하게.</span>
          </h1>
          <p className="mt-[var(--space-lg)] max-w-[600px] text-[clamp(1rem,1.7vw,1.15rem)] leading-7 text-muted [word-break:keep-all]">
            계획부터 추억까지 한곳에서 나눌 수 있는 여행 공간을 만들고
            있어요.
          </p>

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

        <aside
          className="relative w-full max-w-[560px] overflow-hidden rounded-3xl border border-line bg-panel p-[clamp(var(--space-lg),4vw,var(--space-xxl))] shadow-xl lg:max-w-none"
          aria-labelledby="readiness-title"
        >
          <div
            className="absolute -top-14 -right-10 size-36 rounded-full bg-highlight opacity-80"
            aria-hidden="true"
          />
          <p className="relative mb-[var(--space-xs)] text-xs font-extrabold text-brand">
            현재 단계
          </p>
          <h2
            id="readiness-title"
            className="relative text-[clamp(1.65rem,3vw,2.25rem)] font-extrabold tracking-[-0.035em]"
          >
            Next.js 웹 기반
          </h2>
          <ul className="my-[var(--space-xl)] grid list-none gap-[var(--space-md)] p-0">
            {readinessItems.map((item) => (
              <li
                className="flex items-center gap-[var(--space-sm)] text-[0.95rem] font-semibold text-muted"
                key={item}
              >
                <span
                  className="grid size-[26px] shrink-0 place-items-center rounded-full bg-brand text-xs font-black text-white"
                  aria-hidden="true"
                >
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
          <div className="grid gap-1 rounded-[18px] bg-soft p-[var(--space-md)]">
            <span className="text-xs font-bold text-muted">웹의 다음 연결</span>
            <strong className="text-[0.95rem]">API health 세로 슬라이스</strong>
          </div>
        </aside>
      </div>
    </main>
  );
}
