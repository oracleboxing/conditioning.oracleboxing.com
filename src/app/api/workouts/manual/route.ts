import { revalidatePath } from "next/cache";
import { createAuthClient } from "@/lib/supabase/auth-server";

type ExerciseRow = {
  id: string;
  title: string;
  category: string | null;
  equipment_tags: string[] | null;
  primary_muscles: string[] | null;
  secondary_muscles: string[] | null;
  movement_patterns: string[] | null;
  boxing_qualities: string[] | null;
};

type OrderedExercise = ExerciseRow & {
  blockType: "warmup" | "strength" | "conditioning" | "core" | "mobility" | "main" | "finisher" | "cooldown";
  blockTitle: string;
  sets: number | null;
  reps: string | null;
  restSeconds: number | null;
  tempo: string | null;
  coachingNote: string;
  score: number;
};

function cleanIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string" && /^[0-9a-f-]{32,36}$/i.test(item)))].slice(0, 20);
}

function hasAny(haystack: string, needles: string[]) {
  return needles.some((needle) => haystack.includes(needle));
}

function classifyExercise(exercise: ExerciseRow, index: number): OrderedExercise {
  const text = [exercise.title, exercise.category, ...(exercise.equipment_tags ?? []), ...(exercise.primary_muscles ?? []), ...(exercise.secondary_muscles ?? []), ...(exercise.movement_patterns ?? []), ...(exercise.boxing_qualities ?? [])]
    .join(" ")
    .toLowerCase();

  if (hasAny(text, ["circle", "warm", "mobility", "dynamic", "activation", "external rotation", "shoulder circles", "arm circles"])) {
    return { ...exercise, blockType: "warmup", blockTitle: "Warm-up", sets: 2, reps: "45s", restSeconds: 15, tempo: null, coachingNote: "Use this to find range and switch the right muscles on before the harder work.", score: 0 + index / 100 };
  }

  if (hasAny(text, ["stretch", "seated glute", "smr", "release", "cooldown"])) {
    return { ...exercise, blockType: "cooldown", blockTitle: "Stretch down", sets: 2, reps: "60s each side", restSeconds: 15, tempo: null, coachingNote: "Bring the breathing down and leave the joints feeling better than they started.", score: 700 + index / 100 };
  }

  if (hasAny(text, ["pallof", "plank", "dead bug", "twist", "crunch", "core", "abs", "abdominal", "oblique"])) {
    return { ...exercise, blockType: "core", blockTitle: "Core and rotation", sets: 3, reps: "8-12 each side", restSeconds: 35, tempo: "Controlled", coachingNote: "Brace first, then move. The point is transfer and control, not rushing reps.", score: 400 + index / 100 };
  }

  if (hasAny(text, ["jump", "throw", "snatch", "push press", "jammer", "power", "explosive", "swing", "plyometric"])) {
    return { ...exercise, blockType: "conditioning", blockTitle: "Power and snap", sets: 4, reps: "5-8", restSeconds: 60, tempo: "Explosive", coachingNote: "Fast intent, full reset. Make every rep sharp like a clean punch, not a tired shove.", score: 300 + index / 100 };
  }

  if (hasAny(text, ["lunge", "squat", "bridge", "hip thrust", "row", "press", "pull", "raise", "curl", "glute", "hamstring", "quad", "shoulder", "chest", "back"])) {
    return { ...exercise, blockType: "strength", blockTitle: "Strength", sets: 3, reps: "8-10", restSeconds: 60, tempo: "Controlled", coachingNote: "Own the position before chasing load. Keep it useful for boxing posture and force transfer.", score: 200 + index / 100 };
  }

  return { ...exercise, blockType: "main", blockTitle: "Main work", sets: 3, reps: "10", restSeconds: 45, tempo: null, coachingNote: "Keep the reps clean and boxer-like. Quality first.", score: 500 + index / 100 };
}

function workoutTitle(exercises: OrderedExercise[]) {
  const hasRotation = exercises.some((exercise) => exercise.blockType === "core" || /pallof|twist|rotation/i.test(exercise.title));
  const hasPower = exercises.some((exercise) => exercise.tempo === "Explosive" || /throw|jump|jammer|push press/i.test(exercise.title));
  const hasGlutes = exercises.some((exercise) => /glute|lunge|hip|squat/i.test(exercise.title));
  const hasShoulders = exercises.some((exercise) => /shoulder|face pull|external rotation|press/i.test(exercise.title));

  if (hasPower && hasShoulders) return "Punch Power Session";
  if (hasRotation && hasGlutes) return "Rotation + Glute Session";
  if (hasRotation) return "Boxing Core Session";
  if (hasGlutes) return "Boxing Legs Session";
  return "Boxing S&C Session";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { exerciseIds?: unknown } | null;
  const ids = cleanIds(body?.exerciseIds);
  if (!ids.length) return Response.json({ error: "missing_exercises", message: "Choose at least one exercise." }, { status: 400 });

  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized", message: "Sign in required." }, { status: 401 });

  const { data, error } = await supabase
    .from("exercises")
    .select("id,title,category,equipment_tags,primary_muscles,secondary_muscles,movement_patterns,boxing_qualities")
    .in("id", ids)
    .eq("is_active", true);

  if (error) return Response.json({ error: "exercise_lookup_failed", message: error.message }, { status: 500 });

  const byId = new Map((data ?? []).map((exercise) => [exercise.id, exercise as ExerciseRow]));
  const ordered = ids
    .map((id, index) => (byId.has(id) ? classifyExercise(byId.get(id)!, index) : null))
    .filter((exercise): exercise is OrderedExercise => Boolean(exercise))
    .sort((a, b) => a.score - b.score);

  if (!ordered.length) return Response.json({ error: "no_valid_exercises", message: "No valid exercises found." }, { status: 400 });

  const equipment = [...new Set(ordered.flatMap((exercise) => exercise.equipment_tags ?? []).filter(Boolean))].slice(0, 6);
  const durationMinutes = Math.max(18, Math.min(60, ordered.length * 6));

  const { data: workout, error: workoutError } = await supabase
    .from("workouts")
    .insert({
      user_id: user.id,
      title: workoutTitle(ordered),
      goal: "manual-boxing-snc",
      duration_minutes: durationMinutes,
      difficulty: "all-levels",
      equipment,
      visibility: "community",
      intake_summary: "Manual workout created from selected exercises. AI ordered it into a boxing S&C session automatically.",
      ai_model: "manual-smart-order-v1",
    })
    .select("id")
    .single();

  if (workoutError || !workout) return Response.json({ error: "workout_create_failed", message: workoutError?.message ?? "Could not create workout." }, { status: 500 });

  const items = ordered.map((exercise, index) => ({
    workout_id: workout.id,
    exercise_id: exercise.id,
    order_index: index,
    block_type: exercise.blockType,
    block_title: exercise.blockTitle,
    sets: exercise.sets,
    reps: exercise.reps,
    rest_seconds: exercise.restSeconds,
    tempo: exercise.tempo,
    coaching_note: exercise.coachingNote,
  }));

  const { error: itemError } = await supabase.from("workout_items").insert(items);
  if (itemError) return Response.json({ error: "workout_items_failed", message: itemError.message, workoutId: workout.id }, { status: 500 });

  revalidatePath("/app");
  revalidatePath("/app/workouts");
  revalidatePath("/app/community");

  return Response.json({ workoutId: workout.id, url: `/workouts/${workout.id}` });
}
