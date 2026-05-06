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
  const { workouts } = await getSavedWorkouts(user?.id);

  return (
    <div className="space-y-6">
      <div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">My plans</h1>
          <p className="mt-2 text-sm text-slate-500">Saved plans you have created.</p>
        </div>
      </div>

      {workouts.length ? (
        <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {workouts.map((workout) => (
            <Link key={workout.id} href={`/workouts/${workout.id}`} className="grid gap-3 p-4 hover:bg-slate-50 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <h2 className="font-medium text-slate-950">{workout.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{[workout.durationMinutes ? `${workout.durationMinutes} min` : null, workout.difficulty, workout.equipment?.join(", ")].filter(Boolean).join(" · ")}</p>
              </div>
              <p className="text-sm text-slate-400">{formatDate(workout.createdAt)}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="font-medium text-slate-950">No saved plans yet.</p>
          <p className="mt-2 text-sm text-slate-500">Create a plan and it will appear here.</p>
        </div>
      )}
    </div>
  );
}
