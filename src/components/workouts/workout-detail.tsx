"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { WorkoutActionsMenu } from "@/components/workouts/workout-actions-menu";
import { planPreviewFromWorkoutDisplay } from "@/components/plans/plan-preview-adapters";
import { PlanPreview } from "@/components/plans/plan-preview";
import type { WorkoutDisplay } from "@/lib/workouts/types";

function scrollParentFor(element: HTMLElement | null) {
  let parent = element?.parentElement ?? null;
  while (parent) {
    const style = window.getComputedStyle(parent);
    if (/(auto|scroll)/.test(style.overflowY)) return parent;
    parent = parent.parentElement;
  }
  return null;
}

export function WorkoutDetail({ workout, notice }: { workout: WorkoutDisplay; notice?: string }) {
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerHidden, setHeaderHidden] = useState(false);

  useEffect(() => {
    const scroller = scrollParentFor(headerRef.current);
    if (!scroller) return;

    let lastTop = scroller.scrollTop;

    const onScroll = () => {
      const currentTop = scroller.scrollTop;
      const delta = currentTop - lastTop;

      if (currentTop < 24) {
        setHeaderHidden(false);
      } else if (delta > 8) {
        setHeaderHidden(true);
      } else if (delta < -8) {
        setHeaderHidden(false);
      }

      lastTop = currentTop;
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="min-h-screen bg-white text-black">
      {/* Desktop preview mode: iPhone wrapper temporarily bypassed. */}
      <div style={{ maxWidth: 500 }} className="mx-auto min-h-screen w-full bg-white">
        <div ref={headerRef} className={`sticky top-0 z-40 bg-gradient-to-b from-white via-white/90 to-transparent px-6 pb-3 pt-8 transition-transform duration-200 ease-out ${headerHidden ? "-translate-y-full" : "translate-y-0"}`}>
          <div className="flex items-center justify-between gap-3">
            <Link href="/app/workouts" className="rounded-full border border-zinc-200 bg-white/85 px-3 py-2 text-sm font-semibold text-zinc-600 shadow-sm backdrop-blur transition hover:text-black">
              ← Back
            </Link>
            <WorkoutActionsMenu
              workoutId={workout.id}
              saveTargetWorkoutId={workout.sharedSourceWorkoutId}
              chatSessionId={workout.sharedSourceWorkoutId ? null : workout.chatSessionId}
              canEdit={workout.isOwnWorkout && !workout.sharedSourceWorkoutId}
              canDelete={workout.isOwnWorkout && !workout.sharedSourceWorkoutId}
              canSave={!workout.isOwnWorkout || Boolean(workout.sharedSourceWorkoutId)}
              initiallySaved={workout.isSavedByCurrentUser || Boolean(workout.sharedSourceWorkoutId)}
            />
          </div>
        </div>

        <div className="mx-auto w-full px-6 pb-8 pt-1">
          {notice ? <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">{notice}</div> : null}
          <PlanPreview plan={planPreviewFromWorkoutDisplay(workout)} />
        </div>
      </div>
    </main>
  );
}
