import Link from "next/link";
import { createAuthClient } from "@/lib/supabase/auth-server";
import { getSavedWorkouts } from "@/lib/workouts/data";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) return "Draft";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export default async function MyWorkoutsPage() {
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { workouts, source, note } = await getSavedWorkouts(user?.id);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#007aff]">My Workouts</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Your saved training lab.</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-500">
              Saved sessions, generated previews and member-specific conditioning plans live here. Open one to review the full exercise flow.
            </p>
          </div>
          <Link href="/app/create" className="rounded-full bg-[#007aff] px-6 py-4 text-center text-sm font-semibold uppercase tracking-[0.12em] text-white shadow-sm transition hover:bg-[#2f96ff]">
            Create workout
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {workouts.map((workout) => (
          <Link
            key={workout.id}
            href={`/workouts/${workout.id}`}
            className="group flex min-h-72 flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-[#007aff]/50 hover:bg-[#007aff]/10 sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {workout.visibility}
              </span>
              <span className="text-xs font-semibold text-slate-500">{formatDate(workout.createdAt)}</span>
            </div>
            <h2 className="mt-5 text-xl font-semibold leading-tight tracking-tight text-slate-950 group-hover:text-slate-950">{workout.title}</h2>
            <p className="mt-3 line-clamp-4 text-sm leading-6 text-slate-500">{workout.goal ?? "Saved Oracle Performance Lab session."}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                {workout.durationMinutes ? `${workout.durationMinutes} min` : "Flexible"}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                {workout.difficulty ?? "Adaptive"}
              </span>
              {(workout.equipment.length ? workout.equipment : ["Bodyweight"]).slice(0, 3).map((item) => (
                <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                  {item}
                </span>
              ))}
            </div>

            <p className="mt-auto pt-6 text-sm font-semibold uppercase tracking-[0.1em] text-slate-950">Open workout →</p>
          </Link>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Source</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
              {source === "supabase" ? "Live saved workouts" : "Demo fallback"}
            </h2>
            {note ? <p className="mt-2 text-sm leading-6 text-slate-500">{note}</p> : null}
          </div>
          <Link href="/app/community" className="rounded-full border border-slate-300 px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-950 transition hover:bg-slate-100">
            Browse community
          </Link>
        </div>
      </section>
    </div>
  );
}
