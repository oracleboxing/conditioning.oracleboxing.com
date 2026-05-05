import Link from "next/link";
import { createAuthClient } from "@/lib/supabase/auth-server";
import { getSavedWorkouts } from "@/lib/workouts/data";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) return "Draft";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(new Date(value));
}

export default async function AppHome() {
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const saved = await getSavedWorkouts(user?.id);
  const recent = saved.workouts.slice(0, 6);

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Conditioning</h1>
          <p className="mt-2 text-sm text-slate-500">Create, save and review boxing-specific S&amp;C workouts.</p>
        </div>
        <Link href="/app/create" className="w-fit rounded-lg bg-[#007aff] px-4 py-2 text-sm font-medium text-white hover:bg-[#2f96ff]">
          New workout
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Link href="/app/create" className="rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-300">
          <h2 className="font-semibold text-slate-950">Create workout</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Chat through your goal, equipment and constraints.</p>
        </Link>
        <Link href="/app/workouts" className="rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-300">
          <h2 className="font-semibold text-slate-950">My workouts</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Open previously saved sessions.</p>
        </Link>
        <Link href="/app/community" className="rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-300">
          <h2 className="font-semibold text-slate-950">Community</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Browse member-shared workouts.</p>
        </Link>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-950">Recent workouts</h2>
          <Link href="/app/workouts" className="text-sm text-[#007aff] hover:underline">View all</Link>
        </div>
        {recent.length ? (
          <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {recent.map((workout) => (
              <Link key={workout.id} href={`/workouts/${workout.id}`} className="grid gap-2 p-4 hover:bg-slate-50 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="font-medium text-slate-950">{workout.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{[workout.durationMinutes ? `${workout.durationMinutes} min` : null, workout.difficulty, workout.equipment?.[0]].filter(Boolean).join(" · ")}</p>
                </div>
                <p className="text-sm text-slate-400">{formatDate(workout.createdAt)}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="font-medium text-slate-950">No saved workouts yet.</p>
            <p className="mt-2 text-sm text-slate-500">Create your first workout to start building your library.</p>
          </div>
        )}
      </section>
    </div>
  );
}
