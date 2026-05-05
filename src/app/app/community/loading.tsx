export default function CommunityLoading() {
  return (
    <main className="min-h-screen bg-[#05070a] px-5 py-6 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-[2.5rem] border border-white/10 bg-[#0b111a] p-6 sm:p-10">
          <div className="h-6 w-44 animate-pulse rounded-full bg-white/10" />
          <div className="mt-8 h-16 max-w-3xl animate-pulse rounded-3xl bg-white/10" />
          <div className="mt-4 h-6 max-w-2xl animate-pulse rounded-full bg-white/10" />
          <div className="mt-2 h-6 max-w-xl animate-pulse rounded-full bg-white/10" />
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-[#0b111a] p-5">
          <div className="grid gap-4 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-2xl bg-white/10" />
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-80 animate-pulse rounded-[2rem] border border-white/10 bg-white/[0.04]" />
          ))}
        </section>
      </div>
    </main>
  );
}
