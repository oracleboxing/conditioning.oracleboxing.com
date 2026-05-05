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
    <div className="text-slate-950">
      <div className="mx-auto max-w-none">
        <header className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:p-8">
            <div>
              <div className="mb-6 flex flex-wrap gap-2">
                <Link href="/app" className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-100 hover:text-slate-950">
                  Back to app
                </Link>
                <span className="rounded-full bg-[#007aff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white">
                  {source === "supabase" ? "Live member feed" : "Mock seed feed"}
                </span>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#7db7ff]">Community gallery</p>
              <h1 className="mt-4 max-w-4xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Borrow the sessions other serious boxers are building.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                A premium proof feed for generated workouts, member templates and coach-approved conditioning ideas. Search by goal, kit, duration and difficulty, then save what fits your week.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#007aff]">Visibility model</p>
              <div className="mt-6 space-y-3">
                {[
                  ["Private", "Only the member can see it while the workout is being generated or kept personal."],
                  ["Community", "A member opts in to share the finished session with the gallery."],
                  ["Coach-approved", "Later layer for Oracle staff to feature sessions as trusted templates."],
                ].map(([label, copy]) => (
                  <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="font-semibold text-slate-950">{label}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{copy}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Shared sessions</p>
            <p className="mt-3 font-mono text-4xl font-semibold text-slate-950">{workouts.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Fast filters</p>
            <p className="mt-3 text-xl font-semibold text-slate-950">Goal + kit + level</p>
          </div>
          <div className="rounded-2xl border border-[#007aff]/30 bg-[#007aff]/10 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7db7ff]">Next connection</p>
            <p className="mt-3 text-xl font-semibold text-slate-950">Generated workouts</p>
          </div>
        </section>

        <section className="mt-8">
          <CommunityGallery workouts={workouts} sourceNote={note} />
        </section>
      </div>
    </div>
  );
}
