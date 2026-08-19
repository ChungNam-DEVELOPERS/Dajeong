export default function NotificationsLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4 py-8">
      <section aria-busy="true" aria-live="polite" className="w-full max-w-xl rounded-3xl border border-line bg-panel p-8 shadow-xl">
        <p className="text-sm font-extrabold text-brand-strong">Notifications</p>
        <h1 className="mt-3 text-3xl font-black">알림함을 준비하고 있어요</h1>
        <p className="mt-3 leading-7 text-muted">최신 일정 변경과 읽음 상태를 확인 중입니다.</p>
      </section>
    </main>
  );
}
