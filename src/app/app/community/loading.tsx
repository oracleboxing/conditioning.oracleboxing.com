export default function CommunityLoading() {
  return (
    <main className="min-h-screen bg-white px-5 py-6 text-slate-950 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-none space-y-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="h-6 w-44 animate-pulse rounded-full bg-slate-100" />
          <div className="mt-8 h-12 max-w-3xl animate-pulse rounded-2xl bg-slate-100" />
          <div className="mt-4 h-5 max-w-2xl animate-pulse rounded-full bg-slate-100" />
          <div className="mt-2 h-5 max-w-xl animate-pulse rounded-full bg-slate-100" />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="grid gap-4 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          ))}
        </section>
      </div>
    </main>
  );
}
