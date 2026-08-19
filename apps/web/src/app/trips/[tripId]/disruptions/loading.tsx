export default function TripDisruptionsLoading() {
  return (
    <main className="min-h-screen bg-canvas px-4 py-12 sm:px-8">
      <div className="mx-auto max-w-6xl animate-pulse rounded-3xl border border-line bg-white p-8">
        <div className="h-4 w-28 rounded bg-soft" />
        <div className="mt-5 h-12 w-3/4 rounded bg-soft" />
        <div className="mt-10 h-72 rounded-2xl bg-soft" />
      </div>
    </main>
  );
}
