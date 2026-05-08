import type { GeneratedWorkout } from "@/lib/ai/workout-types";
import type { WorkoutDisplay, WorkoutItem } from "@/lib/workouts/types";

export type PlanPreviewMetric = {
  label: string;
  value: string;
};

export type PlanPreviewItem = {
  id: string;
  name: string;
  prescription: string;
  prescriptionParts: PlanPreviewMetric[];
  imageUrls: string[];
  instructions: string[];
};

export type PlanPreviewModel = {
  title: string;
  sections: Array<{
    id: string;
    title?: string;
    items: PlanPreviewItem[];
  }>;
};

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

function repsLabel(value: string | null | undefined) {
  if (!value) return null;
  if (/\b(rep|second|sec|minute|min|metre|meter|round|calorie|hold|each)\b/i.test(value)) return value;
  if (/^\d+(-\d+)?$/i.test(value.trim())) return `${value.trim()} reps`;
  return value;
}

function savedPrescriptionParts(item: WorkoutItem): PlanPreviewMetric[] {
  return [
    item.sets ? { label: "Sets", value: String(item.sets) } : null,
    repsLabel(item.reps) ? { label: "Reps", value: repsLabel(item.reps)! } : null,
    formatDuration(item.durationSeconds) ? { label: "Time", value: formatDuration(item.durationSeconds)! } : null,
    item.restSeconds !== null ? { label: "Rest", value: `${item.restSeconds}s` } : null,
  ].filter((part): part is PlanPreviewMetric => Boolean(part));
}

function generatedPrescriptionParts(item: GeneratedWorkout["blocks"][number]["items"][number]): PlanPreviewMetric[] {
  return [
    item.sets ? { label: "Sets", value: String(item.sets) } : null,
    repsLabel(item.reps) ? { label: "Reps", value: repsLabel(item.reps)! } : null,
    formatDuration(item.durationSeconds) ? { label: "Time", value: formatDuration(item.durationSeconds)! } : null,
    item.restSeconds !== null ? { label: "Rest", value: `${item.restSeconds}s` } : null,
  ].filter((part): part is PlanPreviewMetric => Boolean(part));
}

function prescriptionFromParts(parts: PlanPreviewMetric[]) {
  if (!parts.length) return "As prescribed";

  const sets = parts.find((part) => part.label === "Sets")?.value;
  const reps = parts.find((part) => part.label === "Reps")?.value;
  const time = parts.find((part) => part.label === "Time")?.value;
  const rest = parts.find((part) => part.label === "Rest")?.value;
  const work = reps ?? time;
  const main = sets && work ? `${sets} ${sets === "1" ? "set" : "sets"} x ${work}` : work ?? (sets ? `${sets} ${sets === "1" ? "set" : "sets"}` : null);

  if (main && rest) return `${main} and ${rest} rest`;
  if (main) return main;
  if (rest) return `${rest} rest`;

  return parts.map((part) => part.value).join(" · ");
}

export function planPreviewFromWorkoutDisplay(workout: WorkoutDisplay): PlanPreviewModel {
  return {
    title: workout.title,
    sections: workout.sections.map((section) => ({
      id: section.type,
      title: section.title ?? section.type,
      items: section.items.map((item) => {
        const prescriptionParts = savedPrescriptionParts(item);
        return {
          id: item.id,
          name: item.exercise.name,
          prescription: prescriptionFromParts(prescriptionParts),
          prescriptionParts,
          imageUrls: item.exercise.imageUrls.length ? item.exercise.imageUrls.slice(0, 2) : item.exercise.imageUrl ? [item.exercise.imageUrl] : [],
          instructions: compactInstructions(item.exercise.instructions.length ? item.exercise.instructions : [item.coachingNote, ...item.coachingCues]),
        };
      }),
    })),
  };
}

export function planPreviewFromGeneratedWorkout(workout: GeneratedWorkout): PlanPreviewModel {
  return {
    title: workout.title,
    sections: workout.blocks.map((block, blockIndex) => ({
      id: `${block.type}-${blockIndex}`,
      title: block.title ?? block.type,
      items: block.items.map((item, itemIndex) => {
        const prescriptionParts = generatedPrescriptionParts(item);
        return {
          id: item.itemId ?? `${block.type}-${item.exerciseId}-${itemIndex}`,
          name: item.exercise?.title ?? item.exerciseId,
          prescription: prescriptionFromParts(prescriptionParts),
          prescriptionParts,
          imageUrls: item.exercise?.imageUrls?.length ? item.exercise.imageUrls.slice(0, 2) : item.exercise?.imageUrl ? [item.exercise.imageUrl] : [],
          instructions: compactInstructions([item.exercise?.instructionsSummary, item.coachingNote]),
        };
      }),
    })),
  };
}
