export default function InviteLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4 py-10 sm:px-8">
      <section
        aria-busy="true"
        aria-live="polite"
        className="w-full max-w-xl rounded-3xl border border-line bg-panel p-[clamp(1.5rem,6vw,3rem)] shadow-xl"
      >
        <p className="text-xs font-extrabold tracking-[0.08em] text-brand-strong uppercase">
          Trip invitation
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.04em]">
          초대장을 여는 중이에요
        </h1>
      </section>
    </main>
  );
}
