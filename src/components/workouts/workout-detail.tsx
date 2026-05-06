import Link from "next/link";
import { IPhonePreview } from "@/components/app/iphone-preview";
import { planPreviewFromWorkoutDisplay } from "@/components/plans/plan-preview-adapters";
import { PlanPreview } from "@/components/plans/plan-preview";
import type { WorkoutDisplay } from "@/lib/workouts/types";

export function WorkoutDetail({ workout, notice }: { workout: WorkoutDisplay; notice?: string }) {
  return (
    <IPhonePreview>
      <main className="min-h-full bg-white pb-8 text-black">
        <div className="sticky top-0 z-40 bg-transparent px-4 pb-2 pt-8">
          <div className="flex items-center justify-between gap-3">
            <Link href="/app/workouts" className="rounded-full border border-zinc-200 bg-white/85 px-3 py-2 text-sm font-semibold text-zinc-600 shadow-sm backdrop-blur transition hover:text-black">
              ← Back to plans
            </Link>
            {workout.chatSessionId ? (
              <Link href={{ pathname: "/app/create", query: { sessionId: workout.chatSessionId, next: `/workouts/${workout.id}` } }} className="rounded-full bg-[#007aff] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2f96ff]">
                Edit in chat
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mx-auto w-full px-4 pb-4 pt-1">
          {notice ? <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">{notice}</div> : null}
          <PlanPreview plan={planPreviewFromWorkoutDisplay(workout)} />
        </div>
      </main>
    </IPhonePreview>
  );
}
