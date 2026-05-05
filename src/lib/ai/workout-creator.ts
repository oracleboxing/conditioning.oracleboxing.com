import { searchExercises, type CompactExercise } from "@/lib/exercises/search";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { intakeExtractionPrompt, workoutAssumptionsPrompt, workoutGenerationPrompt, workoutSwapPrompt } from "@/lib/ai/workout-prompts";
import { openAiJson, openAiTextStream, workoutModel } from "@/lib/ai/openai";
import type {
  GeneratedWorkout,
  GeneratedWorkoutBlock,
  GeneratedWorkoutItem,
  WorkoutChatMessage,
  WorkoutIntake,
  WorkoutPersistence,
} from "@/lib/ai/workout-types";

const EMPTY_INTAKE: WorkoutIntake = {
  goal: null,
  equipment: [],
  timeMinutes: null,
  level: null,
  injuriesOrConstraints: null,
  boxingFocus: null,
};

const WORKOUT_TABLE_MISSING_CODES = new Set(["42P01", "PGRST205", "PGRST202"]);

function cleanString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function cleanEquipment(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim().toLowerCase()).filter(Boolean))];
}

function cleanTime(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.min(120, Math.max(10, Math.round(parsed)));
}

function cleanLevel(value: unknown): WorkoutIntake["level"] {
  if (value === "beginner" || value === "intermediate" || value === "advanced" || value === "unknown") return value;
  return null;
}

function normalizeIntake(value: Partial<WorkoutIntake> | null | undefined): WorkoutIntake {
  return {
    goal: cleanString(value?.goal),
    equipment: cleanEquipment(value?.equipment),
    timeMinutes: cleanTime(value?.timeMinutes),
    level: cleanLevel(value?.level),
    injuriesOrConstraints: cleanString(value?.injuriesOrConstraints),
    boxingFocus: cleanString(value?.boxingFocus),
  };
}

function mergeIntake(base: WorkoutIntake, extracted: Partial<WorkoutIntake>) {
  const clean = normalizeIntake(extracted);
  return {
    goal: clean.goal ?? base.goal,
    equipment: clean.equipment.length ? clean.equipment : base.equipment,
    timeMinutes: clean.timeMinutes ?? base.timeMinutes,
    level: clean.level ?? base.level,
    injuriesOrConstraints: clean.injuriesOrConstraints ?? base.injuriesOrConstraints,
    boxingFocus: clean.boxingFocus ?? base.boxingFocus,
  } satisfies WorkoutIntake;
}

function transcriptFrom(messages: WorkoutChatMessage[]) {
  return messages.map((message) => `${message.role}: ${message.content}`).join("\n").slice(-5000);
}

function heuristicExtract(message: string): Partial<WorkoutIntake> {
  const lower = message.toLowerCase();
  const minutes = lower.match(/(\d{2,3})\s*(min|mins|minutes|m)\b/)?.[1];
  const equipment = ["bodyweight", "dumbbell", "dumbbells", "kettlebell", "barbell", "band", "bands", "bench", "pull-up bar", "medicine ball"].filter((item) => lower.includes(item));
  const level = lower.includes("beginner") ? "beginner" : lower.includes("advanced") ? "advanced" : lower.includes("intermediate") ? "intermediate" : undefined;
  const noInjuries = /no (injuries|pain|issues|constraints)/i.test(message);

  return {
    goal: message.length > 8 ? message : undefined,
    equipment: equipment.length ? equipment.map((item) => item.replace(/s$/, "")) : undefined,
    timeMinutes: minutes ? Number(minutes) : undefined,
    level,
    injuriesOrConstraints: noInjuries ? "none" : undefined,
  };
}

export function missingIntakeQuestions(intake: WorkoutIntake) {
  const missing: string[] = [];
  if (!intake.goal) missing.push("What do you want this workout to achieve today?");
  if (!intake.equipment.length) missing.push("What equipment have you got, or should I assume bodyweight?");
  if (!intake.timeMinutes) missing.push("How long have you got?");
  return missing.slice(0, 1);
}

export function applyWorkoutAssumptions(intake: WorkoutIntake): WorkoutIntake {
  return {
    ...intake,
    equipment: intake.equipment.length ? intake.equipment : ["bodyweight"],
    timeMinutes: intake.timeMinutes ?? 30,
    level: intake.level && intake.level !== "unknown" ? intake.level : "intermediate",
    injuriesOrConstraints: intake.injuriesOrConstraints ?? "none stated",
    boxingFocus: intake.boxingFocus ?? "general boxing conditioning",
  };
}

export async function extractIntake(messages: WorkoutChatMessage[], existingIntake?: Partial<WorkoutIntake>) {
  const current = normalizeIntake(existingIntake ?? EMPTY_INTAKE);
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
  const fallback = heuristicExtract(latestUserMessage);
  const extracted = await openAiJson<Partial<WorkoutIntake>>(intakeExtractionPrompt(current, transcriptFrom(messages)), fallback);
  return mergeIntake(current, extracted);
}

function searchTermsFor(intake: WorkoutIntake) {
  const focus = `${intake.goal ?? ""} ${intake.boxingFocus ?? ""}`.toLowerCase();
  const terms = ["squat", "lunge", "push", "row", "plank", "bridge", "rotation", "jump", "stretch"];

  if (focus.includes("glute") || focus.includes("hip")) terms.push("glute", "hip", "bridge", "lunge", "squat", "thrust");
  if (focus.includes("shoulder")) terms.push("shoulder", "external rotation", "press");
  if (focus.includes("footwork") || focus.includes("legs")) terms.push("calf", "step", "jump");
  if (focus.includes("power") || focus.includes("punch")) terms.push("medicine ball", "rotation", "press", "jump", "squat");
  if (focus.includes("engine") || focus.includes("gas") || focus.includes("conditioning")) terms.push("burpee", "mountain climber", "jumping jack");
  if (focus.includes("core") || focus.includes("rotation")) terms.push("plank", "twist", "woodchop");

  return [...new Set(terms)];
}

function equipmentParam(intake: WorkoutIntake) {
  const equipment = intake.equipment.map((item) => item.replace(/s$/, ""));
  if (equipment.includes("bodyweight") || equipment.includes("none")) return "bodyweight";
  return equipment.join(",") || undefined;
}

function stableShuffle<T extends { id: string }>(items: T[], seed: string) {
  const scored = items.map((item) => {
    let hash = 0;
    const source = `${seed}:${item.id}`;
    for (let index = 0; index < source.length; index += 1) {
      hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
    }
    return { item, score: hash };
  });

  return scored.sort((a, b) => a.score - b.score).map(({ item }) => item);
}

export async function gatherExerciseCandidates(intake: WorkoutIntake, rejectedExerciseIds: string[] = []) {
  const equipment = equipmentParam(intake);
  const levels = intake.level && intake.level !== "unknown" ? intake.level : undefined;
  const candidateMap = new Map<string, CompactExercise>();

  const broad = await searchExercises({ equipment, difficulty: levels, limit: 30 });
  broad.data.forEach((exercise) => candidateMap.set(exercise.id, exercise));

  for (const term of searchTermsFor(intake)) {
    if (candidateMap.size >= 80) break;
    const result = await searchExercises({ q: term, equipment, difficulty: levels, limit: 8 });
    result.data.forEach((exercise) => candidateMap.set(exercise.id, exercise));
  }

  if (candidateMap.size < 12 && equipment) {
    const fallback = await searchExercises({ difficulty: levels, limit: 40 });
    fallback.data.forEach((exercise) => candidateMap.set(exercise.id, exercise));
  }

  const rejected = new Set(rejectedExerciseIds);
  const seed = `${intake.goal ?? ""}|${intake.boxingFocus ?? ""}|${intake.equipment.join(",")}|${new Date().toISOString().slice(0, 10)}`;
  return stableShuffle([...candidateMap.values()].filter((exercise) => !rejected.has(exercise.id)), seed).slice(0, 80);
}

export async function streamWorkoutAssumptions(intake: WorkoutIntake, candidates: CompactExercise[]) {
  const fallback = `I’m reading this as ${intake.goal ?? "a boxing conditioning session"}. I’ll assume ${intake.timeMinutes ?? 30} minutes, ${intake.equipment.join(", ") || "bodyweight"}, ${intake.level ?? "intermediate"} level, and I’ll build from the uploaded Supabase free-exercise-db exercises only. I’ll give you a draft to approve or swap before saving.`;
  return openAiTextStream(workoutAssumptionsPrompt(intake, candidates), fallback);
}

function cleanWorkout(value: GeneratedWorkout, intake: WorkoutIntake): GeneratedWorkout {
  return {
    title: cleanString(value.title) ?? "Oracle Conditioning Workout",
    summary: cleanString(value.summary) ?? "A boxing-focused strength and conditioning session.",
    durationMinutes: cleanTime(value.durationMinutes) ?? intake.timeMinutes ?? 30,
    difficulty: value.difficulty === "advanced" || value.difficulty === "intermediate" || value.difficulty === "beginner" ? value.difficulty : "intermediate",
    equipment: cleanEquipment(value.equipment).length ? cleanEquipment(value.equipment) : intake.equipment,
    blocks: Array.isArray(value.blocks) ? value.blocks : [],
    safetyNotes: Array.isArray(value.safetyNotes) ? value.safetyNotes.filter((note): note is string => typeof note === "string") : [],
    progressionNote: cleanString(value.progressionNote) ?? "Repeat once, then progress by adding a little quality volume or reducing rest.",
  };
}

export async function generateWorkout(intake: WorkoutIntake, candidates: CompactExercise[], rejectedExerciseIds: string[] = []) {
  if (!candidates.length) {
    throw new Error("No matching exercises were found for this intake.");
  }

  const fallback: GeneratedWorkout = {
    title: "Oracle Conditioning Preview",
    summary: "A simple boxing-focused conditioning session built from available exercises.",
    durationMinutes: intake.timeMinutes ?? 30,
    difficulty: intake.level === "beginner" || intake.level === "advanced" ? intake.level : "intermediate",
    equipment: intake.equipment,
    blocks: [
      {
        type: "strength",
        title: "Main circuit",
        items: candidates.slice(0, 5).map((exercise) => ({
          exerciseId: exercise.id,
          sets: 3,
          reps: "8-12",
          durationSeconds: null,
          restSeconds: 45,
          tempo: null,
          coachingNote: "Move clean, stay balanced, and keep enough snap for the next round.",
        })),
      },
    ],
    safetyNotes: intake.injuriesOrConstraints && intake.injuriesOrConstraints !== "none" ? [`Respect this constraint: ${intake.injuriesOrConstraints}.`] : [],
    progressionNote: "If it feels too easy, add one round before making exercises harder.",
  };

  const generated = await openAiJson<GeneratedWorkout>(workoutGenerationPrompt(intake, candidates, rejectedExerciseIds), fallback);
  return cleanWorkout(generated, intake);
}

function keyForExerciseLookup(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function uuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function swapWorkoutExercise(intake: WorkoutIntake, workout: GeneratedWorkout, candidates: CompactExercise[], rejectedExerciseIds: string[], instruction: string) {
  const fallback: GeneratedWorkout = {
    ...workout,
    blocks: workout.blocks.map((block) => ({
      ...block,
      items: block.items.map((item) => {
        if (!rejectedExerciseIds.includes(item.exerciseId)) return item;
        const replacement = candidates.find((exercise) => !rejectedExerciseIds.includes(exercise.id) && !workout.blocks.some((candidateBlock) => candidateBlock.items.some((candidateItem) => candidateItem.exerciseId === exercise.id)));
        return replacement ? { ...item, exerciseId: replacement.id, exercise: replacement, coachingNote: `Swapped in ${replacement.title}. Keep it crisp and boxing-relevant.` } : item;
      }),
    })),
  };

  const generated = await openAiJson<GeneratedWorkout>(workoutSwapPrompt(intake, workout, candidates, rejectedExerciseIds, instruction), fallback);
  return cleanWorkout(generated, intake);
}

export async function validateWorkoutExercises(workout: GeneratedWorkout, candidates: CompactExercise[]) {
  const candidateById = new Map(candidates.map((exercise) => [exercise.id, exercise]));
  const candidateByLooseKey = new Map<string, CompactExercise>();

  for (const exercise of candidates) {
    candidateByLooseKey.set(keyForExerciseLookup(exercise.id), exercise);
    candidateByLooseKey.set(keyForExerciseLookup(exercise.slug), exercise);
    candidateByLooseKey.set(keyForExerciseLookup(exercise.title), exercise);
  }

  const warnings: string[] = [];
  const normalizedBlocks: GeneratedWorkoutBlock[] = workout.blocks
    .map((block) => ({
      ...block,
      items: block.items
        .map((item): GeneratedWorkoutItem | null => {
          const matched = candidateById.get(item.exerciseId) ?? candidateByLooseKey.get(keyForExerciseLookup(item.exerciseId));
          if (!matched) {
            warnings.push(`Removed invalid exercise: ${item.exerciseId}`);
            return null;
          }
          return { ...item, exerciseId: matched.id, exercise: matched };
        })
        .filter((item): item is GeneratedWorkoutItem => Boolean(item)),
    }))
    .filter((block) => block.items.length);

  const selectedIds = [...new Set(normalizedBlocks.flatMap((block) => block.items.map((item) => item.exerciseId)).filter(uuidLike))];

  if (!selectedIds.length) return { workout: { ...workout, blocks: normalizedBlocks }, warnings: [...warnings, "No valid Supabase exercise IDs were selected."] };

  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase.from("exercises").select("id").in("id", selectedIds).eq("is_active", true);

  if (error) {
    return { workout: { ...workout, blocks: normalizedBlocks }, warnings: [...warnings, `Exercise validation warning: ${error.message}`] };
  }

  const rows = (data ?? []) as Array<{ id: string }>;
  const validIds = new Set(rows.map((row) => row.id));
  const blocks: GeneratedWorkoutBlock[] = normalizedBlocks
    .map((block) => ({
      ...block,
      items: block.items.filter((item) => {
        const valid = validIds.has(item.exerciseId);
        if (!valid) warnings.push(`Removed unavailable exercise: ${item.exercise?.title ?? item.exerciseId}`);
        return valid;
      }),
    }))
    .filter((block) => block.items.length);

  return { workout: { ...workout, blocks }, warnings };
}

function missingWorkoutTableReason(error: { code?: string; message?: string }) {
  if (error.code && WORKOUT_TABLE_MISSING_CODES.has(error.code)) return true;
  const message = error.message?.toLowerCase() ?? "";
  return message.includes("workouts") && (message.includes("does not exist") || message.includes("schema cache"));
}

export async function saveWorkoutForUser(userId: string, intake: WorkoutIntake, workout: GeneratedWorkout): Promise<WorkoutPersistence> {
  const supabase = getServerSupabaseClient() as unknown as {
    from: (table: string) => {
      insert: (values: unknown) => {
        select: (columns: string) => { single: () => Promise<{ data: { id: string } | null; error: { code?: string; message: string } | null }> };
      } & Promise<{ data: unknown; error: { code?: string; message: string } | null }>;
    };
  };
  const { data: workoutRow, error: workoutError } = await supabase
    .from("workouts")
    .insert({
      user_id: userId,
      title: workout.title,
      goal: intake.goal,
      duration_minutes: workout.durationMinutes,
      difficulty: workout.difficulty,
      equipment: workout.equipment,
      visibility: "private",
      intake_summary: JSON.stringify(intake),
      ai_model: workoutModel(),
    })
    .select("id")
    .single();

  if (workoutError) {
    if (missingWorkoutTableReason(workoutError)) {
      return { status: "preview_only", reason: "Workout tables are not available yet. See docs/workout-chat-mvp.md for the safe migration SQL." };
    }
    return { status: "preview_only", reason: `Workout preview generated, but saving failed: ${workoutError.message}` };
  }

  if (!workoutRow) {
    return { status: "preview_only", reason: "Workout preview generated, but Supabase did not return a saved workout ID." };
  }

  const items = workout.blocks.flatMap((block, blockIndex) =>
    block.items.map((item, itemIndex) => ({
      workout_id: workoutRow.id,
      exercise_id: item.exerciseId,
      order_index: blockIndex * 100 + itemIndex,
      block_type: block.type,
      block_title: block.title,
      sets: item.sets,
      reps: item.reps,
      duration_seconds: item.durationSeconds,
      rest_seconds: item.restSeconds,
      tempo: item.tempo,
      coaching_note: item.coachingNote,
    })),
  );

  if (items.length) {
    const { error: itemError } = await supabase.from("workout_items").insert(items);
    if (itemError) {
      return { status: "saved", workoutId: workoutRow.id, reason: `Workout saved, but item saving needs attention: ${itemError.message}` };
    }
  }

  return { status: "saved", workoutId: workoutRow.id };
}
