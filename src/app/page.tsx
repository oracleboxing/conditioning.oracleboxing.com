import Link from "next/link";

const proofPoints = [
  ["AI session builder", "Conditioning shaped around boxing demands, equipment, injuries and time."],
  ["Premium member gate", "Private access while the MVP is tested with real Oracle members."],
  ["Performance Lab system", "Clinical, sharp, and built to feel like a serious training tool, not a fitness toy."],
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-white text-slate-950">
      <div className="absolute inset-0 -z-0 bg-white" />
      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-none flex-col justify-center px-5 py-8 sm:px-8 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.1em] text-[#007aff]">
              Oracle Performance Lab
            </p>
            <h1 className="max-w-none text-3xl font-semibold tracking-tight sm:text-4xl">
              Conditioning for boxers who need the engine to match the skill.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-500">
              Strength, running, mobility and conditioning built around boxing. The app is private while the first premium workflow takes shape.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/app"
                className="rounded-full bg-[#007aff] px-7 py-4 text-center text-sm font-semibold uppercase tracking-[0.12em] text-white shadow-sm transition hover:bg-[#2f96ff]"
              >
                Open app
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-slate-300 bg-white px-7 py-4 text-center text-sm font-semibold uppercase tracking-[0.12em] text-slate-950 transition hover:bg-slate-100"
              >
                Sign in
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm backdrop-blur sm:p-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#007aff]">Today&apos;s build</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Boxer Engine 35</h2>
                </div>
                <div className="rounded-2xl bg-[#007aff] px-4 py-3 text-right text-white">
                  <p className="font-mono text-2xl font-semibold">87</p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em]">fit score</p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {["Primer", "Rotational power", "Round-based engine", "Shoulder armour"].map((block, index) => (
                  <div key={block} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-[#007aff] font-semibold text-white">{index + 1}</div>
                    <p className="font-semibold text-slate-950">{block}</p>
                    <p className="font-mono text-sm text-[#007aff]">{index === 0 ? "06m" : "08m"}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {proofPoints.map(([title, copy]) => (
            <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-500">{copy}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
