"use client";

import { useEffect, useState } from "react";
import { WorkoutActionsMenu } from "@/components/workouts/workout-actions-menu";
import { WorkoutCard } from "@/components/workouts/workout-card";
import type { SavedWorkoutSummary } from "@/lib/workouts/data";

export function WorkoutList({ workouts }: { workouts: SavedWorkoutSummary[] }) {
  const [visibleWorkouts, setVisibleWorkouts] = useState(workouts);

  useEffect(() => {
    const onWorkoutRemoved = (event: Event) => {
      const workoutId = (event as CustomEvent<{ workoutId?: string }>).detail?.workoutId;
      if (!workoutId) return;
      setVisibleWorkouts((current) => current.filter((workout) => workout.id !== workoutId));
    };

    window.addEventListener("workout-removed", onWorkoutRemoved);
    return () => window.removeEventListener("workout-removed", onWorkoutRemoved);
  }, []);

  if (!visibleWorkouts.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="font-medium text-slate-950">No saved plans yet.</p>
        <p className="mt-2 text-sm text-slate-500">Create a plan and it will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {visibleWorkouts.map((workout) => (
        <WorkoutCard
          key={workout.id}
          id={workout.id}
          title={workout.title}
          imageUrl={workout.imageUrl}
          durationMinutes={workout.durationMinutes}
          difficulty={workout.difficulty}
          equipment={workout.equipment}
          actionSlot={
            <WorkoutActionsMenu
              workoutId={workout.id}
              saveTargetWorkoutId={workout.sharedSourceWorkoutId}
              chatSessionId={workout.sharedSourceWorkoutId ? null : workout.chatSessionId}
              canEdit={!workout.sharedSourceWorkoutId}
              canDelete={!workout.sharedSourceWorkoutId}
              canSave={Boolean(workout.sharedSourceWorkoutId)}
              initiallySaved={Boolean(workout.sharedSourceWorkoutId)}
              compact
            />
          }
        />
      ))}
    </div>
  );
}
