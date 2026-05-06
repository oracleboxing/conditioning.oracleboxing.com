import { createClient } from "@/lib/supabase/server";
import type { ExerciseStructureJson, Json } from "@/lib/supabase/types";
import type { WorkoutBlockType, WorkoutDisplay, WorkoutItem, WorkoutSection, WorkoutVisibility } from "./types";

const BLOCK_COPY: Record<WorkoutBlockType, { eyebrow: string; fallbackTitle: string; description: string }> = {
  warmup: {
    eyebrow: "Prep",
    fallbackTitle: "Warm-up",
    description: "Get joints, posture and breathing ready before the real work starts.",
  },
  strength: {
    eyebrow: "Strength",
    fallbackTitle: "Strength",
    description: "Controlled reps, clean positions and enough rest to keep standards high.",
  },
  conditioning: {
    eyebrow: "Conditioning",
    fallbackTitle: "Conditioning",
    description: "Push the engine without letting the movement turn into random survival work.",
  },
  core: {
    eyebrow: "Core",
    fallbackTitle: "Core",
    description: "Build the trunk stiffness, rotation control and bracing that carries into boxing.",
  },
  mobility: {
    eyebrow: "Mobility",
    fallbackTitle: "Mobility",
    description: "Open up the ranges you need while keeping the session useful and repeatable.",
  },
  cooldown: {
    eyebrow: "Cooldown",
    fallbackTitle: "Cooldown",
    description: "Bring the system down and leave the next session possible.",
  },
  main: {
    eyebrow: "Main work",
    fallbackTitle: "Main work",
    description: "The meat of the session. Keep standards high before chasing more load or speed.",
  },
  finisher: {
    eyebrow: "Finisher",
    fallbackTitle: "Finisher",
    description: "A short final push that should still look like training, not survival theatre.",
  },
};

const SECTION_ORDER: WorkoutBlockType[] = ["warmup", "strength", "conditioning", "core", "mobility", "main", "finisher", "cooldown"];

type SupabaseWorkoutRow = {
  id: string;
  title: string;
  goal: string | null;
  duration_minutes: number | null;
  difficulty: string | null;
  equipment: string[] | null;
  visibility: WorkoutVisibility | null;
  intake_summary: string | null;
  created_at: string | null;
  workout_items: SupabaseWorkoutItemRow[] | null;
};

type SupabaseWorkoutItemRow = {
  id: string;
  order_index: number | null;
  block_type: string | null;
  block_title: string | null;
  sets: number | null;
  reps: string | null;
  duration_seconds: number | null;
  rest_seconds: number | null;
  tempo: string | null;
  coaching_note: string | null;
  coaching_cues?: string[] | Json | null;
  boxing_relevance?: string | null;
  exercises: SupabaseExerciseRow | SupabaseExerciseRow[] | null;
};

type SupabaseExerciseRow = {
  id: string;
  title?: string | null;
  name?: string | null;
  category: string | null;
  equipment?: string | null;
  equipment_tags?: string[] | null;
  instructions?: string[] | null;
  instructions_json?: Json | null;
  image_paths?: string[] | null;
  image_urls?: string[] | null;
  structure_json?: ExerciseStructureJson | null;
};

export type WorkoutLookupResult =
  | { status: "ready"; workout: WorkoutDisplay; source: "supabase" | "mock"; notice?: string }
  | { status: "not-found" };

export type SavedWorkoutSummary = Pick<
  WorkoutDisplay,
  "id" | "title" | "goal" | "durationMinutes" | "difficulty" | "equipment" | "visibility" | "createdAt"
>;

export type SavedWorkoutsResult = {
  workouts: SavedWorkoutSummary[];
  source: "supabase" | "mock";
  note?: string;
};

function isBlockType(value: string | null): value is WorkoutBlockType {
  return value === "warmup" || value === "strength" || value === "conditioning" || value === "core" || value === "mobility" || value === "main" || value === "finisher" || value === "cooldown";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function firstExercise(row: SupabaseWorkoutItemRow): SupabaseExerciseRow | null {
  if (Array.isArray(row.exercises)) return row.exercises[0] ?? null;
  return row.exercises;
}

function imageUrls(exercise: SupabaseExerciseRow | null): string[] {
  if (!exercise) return [];
  const direct = stringArray(exercise.image_urls);
  const legacy = stringArray(exercise.image_paths);
  const structured = stringArray(exercise.structure_json?.image_paths);
  const stored = stringArray(exercise.structure_json?.source_payload?.storage_image_urls);
  return [...new Set([...direct, ...legacy, ...structured, ...stored].filter((url) => /^https?:\/\//i.test(url)))];
}

function instructions(exercise: SupabaseExerciseRow | null): string[] {
  if (!exercise) return [];
  const direct = stringArray(exercise.instructions);
  const json = stringArray(exercise.instructions_json);
  return direct.length ? direct : json;
}

function equipment(exercise: SupabaseExerciseRow | null): string[] {
  if (!exercise) return [];
  return stringArray(exercise.equipment_tags ?? null).concat(exercise.equipment ? [exercise.equipment] : []);
}

function cues(value: SupabaseWorkoutItemRow["coaching_cues"]): string[] {
  return stringArray(value);
}

function toWorkoutItem(row: SupabaseWorkoutItemRow): WorkoutItem {
  const exercise = firstExercise(row);
  const blockType = isBlockType(row.block_type) ? row.block_type : "main";
  const exerciseImages = imageUrls(exercise);

  return {
    id: row.id,
    orderIndex: row.order_index ?? 0,
    blockType,
    blockTitle: row.block_title ?? BLOCK_COPY[blockType].fallbackTitle,
    exercise: {
      id: exercise?.id ?? row.id,
      name: exercise?.title ?? exercise?.name ?? "Custom exercise",
      category: exercise?.category ?? null,
      imageUrl: exerciseImages[0] ?? null,
      imageUrls: exerciseImages,
      equipment: [...new Set(equipment(exercise))],
      instructions: instructions(exercise),
    },
    sets: row.sets,
    reps: row.reps,
    durationSeconds: row.duration_seconds,
    restSeconds: row.rest_seconds,
    tempo: row.tempo,
    coachingNote: row.coaching_note,
    coachingCues: cues(row.coaching_cues).length ? cues(row.coaching_cues) : instructions(exercise).slice(0, 3),
    boxingRelevance: row.boxing_relevance ?? null,
  };
}

function toSections(items: WorkoutItem[]): WorkoutSection[] {
  const grouped = new Map<WorkoutBlockType, WorkoutItem[]>();
  items
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .forEach((item) => {
      const current = grouped.get(item.blockType) ?? [];
      current.push(item);
      grouped.set(item.blockType, current);
    });

  return SECTION_ORDER.flatMap((type) => {
    const blockItems = grouped.get(type) ?? [];
    if (!blockItems.length) return [];
    const copy = BLOCK_COPY[type];
    return [
      {
        type,
        title: copy.fallbackTitle,
        eyebrow: copy.eyebrow,
        description: copy.description,
        items: blockItems,
      },
    ];
  });
}

function mapWorkout(row: SupabaseWorkoutRow, chatSessionId: string | null = null): WorkoutDisplay {
  const items = (row.workout_items ?? []).map(toWorkoutItem);

  return {
    id: row.id,
    chatSessionId,
    title: row.title,
    goal: row.goal,
    durationMinutes: row.duration_minutes,
    difficulty: row.difficulty,
    equipment: row.equipment ?? [],
    visibility: row.visibility ?? "private",
    intakeSummary: row.intake_summary,
    createdAt: row.created_at,
    sections: toSections(items),
  };
}

function mapSummary(row: Omit<SupabaseWorkoutRow, "workout_items">): SavedWorkoutSummary {
  return {
    id: row.id,
    title: row.title,
    goal: row.goal,
    durationMinutes: row.duration_minutes,
    difficulty: row.difficulty,
    equipment: row.equipment ?? [],
    visibility: row.visibility ?? "private",
    createdAt: row.created_at,
  };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function getWorkoutById(id: string): Promise<WorkoutLookupResult> {
  if (!isUuid(id)) return { status: "not-found" };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let query = supabase
      .from("workouts")
      .select(
        `id,title,goal,duration_minutes,difficulty,equipment,visibility,intake_summary,created_at,
        workout_items(id,order_index,block_type,block_title,sets,reps,duration_seconds,rest_seconds,tempo,coaching_note,
          exercises(id,title,category,equipment_tags,instructions_json,structure_json,image_urls))`,
      )
      .eq("id", id)
      .order("order_index", { referencedTable: "workout_items", ascending: true });

    query = user ? query.or(`visibility.eq.community,user_id.eq.${user.id}`) : query.eq("visibility", "community");

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) return { status: "not-found" };

    let chatSessionId: string | null = null;

    if (user) {
      const { data: sessionData } = await supabase
        .from("workout_chat_sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq("workout_id", id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const session = sessionData as { id?: string } | null;
      chatSessionId = typeof session?.id === "string" ? session.id : null;
    }

    return { status: "ready", workout: mapWorkout(data as unknown as SupabaseWorkoutRow, chatSessionId), source: "supabase" };
  } catch (error) {
    throw error;
  }
}


export async function getSavedWorkouts(userId?: string): Promise<SavedWorkoutsResult> {
  if (!userId) return { workouts: [], source: "supabase" };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("workouts")
      .select("id,title,goal,duration_minutes,difficulty,equipment,visibility,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(12);

    if (error) {
      throw new Error(error.message);
    }

    const workouts = (data ?? []).map((row) => mapSummary(row as unknown as Omit<SupabaseWorkoutRow, "workout_items">));

    return { workouts, source: "supabase" };
  } catch (error) {
    throw error;
  }
}
