export default function WorkoutsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-7 w-32 animate-pulse rounded-full bg-slate-100" />
        <div className="mt-3 h-4 w-56 animate-pulse rounded-full bg-slate-100" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="h-40 animate-pulse bg-slate-100" />
            <div className="space-y-3 p-4">
              <div className="h-5 w-3/4 animate-pulse rounded-full bg-slate-100" />
              <div className="h-4 w-1/2 animate-pulse rounded-full bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
