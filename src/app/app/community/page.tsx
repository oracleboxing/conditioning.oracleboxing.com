import Link from "next/link";
import { CommunityGallery } from "./community-gallery";
import { getCommunityWorkouts } from "@/lib/community/workouts";

export const metadata = {
  title: "Community Gallery | Oracle Conditioning",
  description: "Shared conditioning workouts built by Oracle Boxing members.",
};

export default async function CommunityPage() {
  const { workouts, source, note } = await getCommunityWorkouts();

  return (
    <div className="text-white">
      <div className="mx-auto max-w-7xl">
        <header className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#0b111a] shadow-2xl shadow-black/30">
          <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:p-10">
            <div>
              <div className="mb-6 flex flex-wrap gap-2">
                <Link href="/app" className="rounded-full border border-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[#9aa7b8] transition hover:bg-white/10 hover:text-white">
                  Back to app
                </Link>
                <span className="rounded-full bg-[#b8ff3d] px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[#05070a]">
                  {source === "supabase" ? "Live member feed" : "Mock seed feed"}
                </span>
              </div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#7db7ff]">Community gallery</p>
              <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-[#f6faff] sm:text-6xl">
                Borrow the sessions other serious boxers are building.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[#9aa7b8] sm:text-lg">
                A premium proof feed for generated workouts, member templates and coach-approved conditioning ideas. Search by goal, kit, duration and difficulty, then save what fits your week.
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-[#101a28] p-5">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#b8ff3d]">Visibility model</p>
              <div className="mt-6 space-y-3">
                {[
                  ["Private", "Only the member can see it while the workout is being generated or kept personal."],
                  ["Community", "A member opts in to share the finished session with the gallery."],
                  ["Coach-approved", "Later layer for Oracle staff to feature sessions as trusted templates."],
                ].map(([label, copy]) => (
                  <div key={label} className="rounded-3xl border border-white/10 bg-[#05070a] p-4">
                    <p className="font-black text-[#f6faff]">{label}</p>
                    <p className="mt-1 text-sm leading-6 text-[#9aa7b8]">{copy}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#7a8799]">Shared sessions</p>
            <p className="mt-3 font-mono text-4xl font-black text-[#f6faff]">{workouts.length}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#7a8799]">Fast filters</p>
            <p className="mt-3 text-2xl font-black text-[#f6faff]">Goal + kit + level</p>
          </div>
          <div className="rounded-3xl border border-[#007aff]/30 bg-[#007aff]/10 p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#7db7ff]">Next connection</p>
            <p className="mt-3 text-2xl font-black text-[#f6faff]">Generated workouts</p>
          </div>
        </section>

        <section className="mt-8">
          <CommunityGallery workouts={workouts} sourceNote={note} />
        </section>
      </div>
    </div>
  );
}
