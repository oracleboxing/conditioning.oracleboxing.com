export default function ProfileLoading() {
  return (
    <main className="w-full text-slate-950">
      <section className="space-y-5 px-1 pb-8">
        <div>
          <div className="h-3 w-20 animate-pulse rounded-full bg-slate-100" />
          <div className="mt-3 h-7 w-36 animate-pulse rounded-full bg-slate-100" />
          <div className="mt-3 h-4 w-48 animate-pulse rounded-full bg-slate-100" />
        </div>

        <div className="flex items-center gap-4">
          <div className="h-20 w-20 animate-pulse rounded-full bg-slate-100" />
          <div className="h-10 w-28 animate-pulse rounded-2xl bg-slate-100" />
        </div>

        <div className="space-y-4">
          <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-5 w-44 animate-pulse rounded-full bg-slate-100" />
          <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </section>
    </main>
  );
}
