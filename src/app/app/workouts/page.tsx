import { createAuthClient } from "@/lib/supabase/auth-server";
import { getSavedWorkouts } from "@/lib/workouts/data";
import { WorkoutList } from "./workout-list";

export const dynamic = "force-dynamic";

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

      <WorkoutList workouts={workouts} />
    </div>
  );
}
