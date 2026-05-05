import { searchExercises, type CompactExercise } from "@/lib/exercises/search";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { intakeExtractionPrompt, workoutGenerationPrompt } from "@/lib/ai/workout-prompts";
import { openAiJson } from "@/lib/ai/openai";
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
  if (!intake.equipment.length) missing.push("What equipment have you got, or is it bodyweight only?");
  if (!intake.timeMinutes) missing.push("How long have you got?");
  if (!intake.level || intake.level === "unknown") missing.push("What level should I pitch it at, beginner, intermediate or advanced?");
  if (!intake.injuriesOrConstraints) missing.push("Any injuries, pain or movements to avoid? Say none if you’re clear.");
  if (!intake.boxingFocus) missing.push("What boxing focus should it support, gas tank, footwork, punching power, rotation, shoulders, or general?");
  return missing.slice(0, 2);
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

  if (focus.includes("shoulder")) terms.push("shoulder", "external rotation", "press");
  if (focus.includes("footwork") || focus.includes("legs")) terms.push("calf", "step", "jump");
  if (focus.includes("power") || focus.includes("punch")) terms.push("medicine ball", "rotation", "press");
  if (focus.includes("engine") || focus.includes("gas") || focus.includes("conditioning")) terms.push("burpee", "mountain climber", "jumping jack");
  if (focus.includes("core") || focus.includes("rotation")) terms.push("plank", "twist", "woodchop");

  return [...new Set(terms)];
}

function equipmentParam(intake: WorkoutIntake) {
  const equipment = intake.equipment.map((item) => item.replace(/s$/, ""));
  if (equipment.includes("bodyweight") || equipment.includes("none")) return "bodyweight";
  return equipment.join(",") || undefined;
}

export async function gatherExerciseCandidates(intake: WorkoutIntake) {
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

  return [...candidateMap.values()].slice(0, 80);
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

export async function generateWorkout(intake: WorkoutIntake, candidates: CompactExercise[]) {
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

  const generated = await openAiJson<GeneratedWorkout>(workoutGenerationPrompt(intake, candidates), fallback);
  return cleanWorkout(generated, intake);
}

export async function validateWorkoutExercises(workout: GeneratedWorkout, candidates: CompactExercise[]) {
  const candidateById = new Map(candidates.map((exercise) => [exercise.id, exercise]));
  const selectedIds = [...new Set(workout.blocks.flatMap((block) => block.items.map((item) => item.exerciseId)).filter(Boolean))];

  if (!selectedIds.length) return { workout, warnings: ["No exercises were selected."] };

  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase.from("exercises").select("id,title,slug,category,summary,description,instructions_json,equipment_tags,difficulty,structure_json,is_active").in("id", selectedIds).eq("is_active", true);

  if (error) {
    throw new Error(`Could not validate generated exercises: ${error.message}`);
  }

  const rows = (data ?? []) as Array<{ id: string }>;
  const validIds = new Set(rows.map((row) => row.id));
  const warnings: string[] = [];
  const blocks: GeneratedWorkoutBlock[] = workout.blocks
    .map((block) => ({
      ...block,
      items: block.items
        .filter((item) => {
          const valid = validIds.has(item.exerciseId) && candidateById.has(item.exerciseId);
          if (!valid) warnings.push(`Removed invalid exercise ID: ${item.exerciseId}`);
          return valid;
        })
        .map((item): GeneratedWorkoutItem => ({ ...item, exercise: candidateById.get(item.exerciseId) })),
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
      ai_model: process.env.OPENAI_WORKOUT_MODEL ?? "gpt-4o-mini",
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
