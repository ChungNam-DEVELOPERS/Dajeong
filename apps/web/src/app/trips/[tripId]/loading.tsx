export default function TripItineraryLoading() {
  return (
    <main className="min-h-screen bg-canvas px-4 py-8 sm:px-8 lg:py-12">
      <section
        aria-busy="true"
        aria-live="polite"
        className="mx-auto max-w-xl rounded-3xl border border-line bg-panel p-[clamp(1.5rem,6vw,3rem)] shadow-xl"
      >
        <p className="text-xs font-extrabold tracking-[0.08em] text-brand-strong uppercase">
          Trip itinerary
        </p>
        <h1 className="mt-3 text-3xl font-black">여행 일정을 준비하고 있어요</h1>
        <p className="mt-3 leading-7 text-muted">잠시만 기다려 주세요.</p>
      </section>
    </main>
  );
}
