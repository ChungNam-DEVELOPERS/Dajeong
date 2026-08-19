export default function TripPreferenceLoading() {
  return (
    <main className="min-h-screen bg-canvas px-4 py-8 sm:px-8 lg:py-12">
      <section
        aria-busy="true"
        aria-live="polite"
        className="mx-auto max-w-xl rounded-3xl border border-line bg-panel p-[clamp(1.5rem,6vw,3rem)] shadow-xl"
      >
        <p className="text-xs font-extrabold tracking-[0.08em] text-brand-strong uppercase">
          Private preference
        </p>
        <h1 className="mt-3 text-[clamp(2rem,6vw,3rem)] leading-tight font-black tracking-[-0.04em]">
          나의 선호를 준비하고 있어요
        </h1>
        <p className="mt-3 leading-7 text-muted">
          안전한 선호 입력 화면을 불러오는 중입니다.
        </p>
      </section>
    </main>
  );
}
