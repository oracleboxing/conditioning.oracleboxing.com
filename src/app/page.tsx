import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#07080a] text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-20">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.35em] text-[#7db7ff]">
          Oracle Conditioning
        </p>
        <div className="max-w-3xl">
          <h1 className="text-5xl font-black tracking-tight sm:text-7xl">
            Conditioning for boxers who want the engine to match the skill.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
            Strength, running, mobility and conditioning built around the demands of boxing. The app area is private while the MVP takes shape.
          </p>
        </div>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/app"
            className="rounded-full bg-[#007aff] px-6 py-3 text-center text-sm font-bold uppercase tracking-wide text-white transition hover:bg-[#2f96ff]"
          >
            Open app
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-white/15 px-6 py-3 text-center text-sm font-bold uppercase tracking-wide text-white transition hover:bg-white/10"
          >
            Sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
