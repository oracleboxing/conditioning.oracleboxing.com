export default function AppHomeLoading() {
  return (
    <div className="space-y-6 pb-4">
      <header className="flex justify-center pt-2">
        <div className="h-7 w-44 animate-pulse rounded-full bg-slate-100" />
      </header>
      <section className="space-y-4">
        <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      </section>
    </div>
  );
}
