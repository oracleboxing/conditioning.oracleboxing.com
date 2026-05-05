import Link from "next/link";

const proofPoints = [
  ["AI session builder", "Conditioning shaped around boxing demands, equipment, injuries and time."],
  ["Premium member gate", "Private access while the MVP is tested with real Oracle members."],
  ["Performance Lab system", "Clinical, sharp, and built to feel like a serious training tool, not a fitness toy."],
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#05070A] text-white">
      <div className="absolute inset-0 -z-0 bg-[radial-gradient(circle_at_top_right,rgba(0,122,255,0.32),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(184,255,61,0.10),transparent_30%)]" />
      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-5 py-12 sm:px-8 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="mb-5 text-xs font-black uppercase tracking-[0.32em] text-[#B8FF3D]">
              Oracle Performance Lab
            </p>
            <h1 className="max-w-5xl text-5xl font-black leading-[0.9] tracking-[-0.065em] sm:text-7xl lg:text-8xl">
              Conditioning for boxers who need the engine to match the skill.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Strength, running, mobility and conditioning built around boxing. The app is private while the first premium workflow takes shape.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/app"
                className="rounded-full bg-[#007aff] px-7 py-4 text-center text-sm font-black uppercase tracking-[0.18em] text-white shadow-2xl shadow-[#007aff]/25 transition hover:bg-[#2f96ff]"
              >
                Open app
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-white/15 bg-white/[0.04] px-7 py-4 text-center text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-white/10"
              >
                Sign in
              </Link>
            </div>
          </div>

          <div className="rounded-[2.5rem] border border-white/10 bg-[#0B111A]/90 p-5 shadow-2xl shadow-black/40 backdrop-blur sm:p-6">
            <div className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(0,122,255,0.28),transparent_38%),#101A28] p-5">
              <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#B8FF3D]">Today&apos;s build</p>
                  <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">Boxer Engine 35</h2>
                </div>
                <div className="rounded-2xl bg-[#B8FF3D] px-4 py-3 text-right text-[#05070A]">
                  <p className="font-mono text-3xl font-black">87</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em]">fit score</p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {["Primer", "Rotational power", "Round-based engine", "Shoulder armour"].map((block, index) => (
                  <div key={block} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-3xl border border-white/10 bg-black/25 p-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-[#007aff] font-black text-white">{index + 1}</div>
                    <p className="font-black text-white">{block}</p>
                    <p className="font-mono text-sm text-[#B8FF3D]">{index === 0 ? "06m" : "08m"}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {proofPoints.map(([title, copy]) => (
            <article key={title} className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
              <h3 className="text-xl font-black tracking-tight">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">{copy}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
