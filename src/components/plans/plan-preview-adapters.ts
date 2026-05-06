import type { GeneratedWorkout } from "@/lib/ai/workout-types";
import type { WorkoutDisplay, WorkoutItem } from "@/lib/workouts/types";

export type PlanPreviewItem = {
  id: string;
  name: string;
  prescription: string;
  imageUrls: string[];
  instructions: string[];
};

export type PlanPreviewModel = {
  title: string;
  sections: Array<{
    id: string;
    items: PlanPreviewItem[];
  }>;
};

function plural(value: number, unit: string) {
  return `${value} ${unit}${value === 1 ? "" : "s"}`;
}

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

function compactInstructions(values: Array<string | null | undefined>) {
  return values
    .filter((value): value is string => Boolean(value?.trim()))
    .flatMap((value) => value.split(/\n+/))
    .map((value) => value.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 2);
}

function savedPrescription(item: WorkoutItem) {
  const parts = [
    item.sets ? plural(item.sets, "set") : null,
    item.reps,
    formatDuration(item.durationSeconds),
    item.restSeconds !== null ? `rest ${item.restSeconds}s` : null,
    item.tempo ? `tempo ${item.tempo}` : null,
  ].filter(Boolean);

  return parts.length ? parts.join(" · ") : "As prescribed";
}

function generatedPrescription(item: GeneratedWorkout["blocks"][number]["items"][number]) {
  const parts = [
    item.sets ? plural(item.sets, "set") : null,
    item.reps,
    formatDuration(item.durationSeconds),
    item.restSeconds !== null ? `rest ${item.restSeconds}s` : null,
    item.tempo ? `tempo ${item.tempo}` : null,
  ].filter(Boolean);

  return parts.length ? parts.join(" · ") : "As prescribed";
}

export function planPreviewFromWorkoutDisplay(workout: WorkoutDisplay): PlanPreviewModel {
  return {
    title: workout.title,
    sections: workout.sections.map((section) => ({
      id: section.type,
      items: section.items.map((item) => ({
        id: item.id,
        name: item.exercise.name,
        prescription: savedPrescription(item),
        imageUrls: item.exercise.imageUrls.length ? item.exercise.imageUrls.slice(0, 2) : item.exercise.imageUrl ? [item.exercise.imageUrl] : [],
        instructions: compactInstructions(item.exercise.instructions.length ? item.exercise.instructions : [item.coachingNote, ...item.coachingCues]),
      })),
    })),
  };
}

export function planPreviewFromGeneratedWorkout(workout: GeneratedWorkout): PlanPreviewModel {
  return {
    title: workout.title,
    sections: workout.blocks.map((block, blockIndex) => ({
      id: `${block.type}-${blockIndex}`,
      items: block.items.map((item, itemIndex) => ({
        id: item.itemId ?? `${block.type}-${item.exerciseId}-${itemIndex}`,
        name: item.exercise?.title ?? item.exerciseId,
        prescription: generatedPrescription(item),
        imageUrls: item.exercise?.imageUrls?.length ? item.exercise.imageUrls.slice(0, 2) : item.exercise?.imageUrl ? [item.exercise.imageUrl] : [],
        instructions: compactInstructions([item.exercise?.instructionsSummary, item.coachingNote]),
      })),
    })),
  };
}
