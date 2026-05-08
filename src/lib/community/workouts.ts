import { createClient, getServerSupabaseClient } from "@/lib/supabase/server";

export type WorkoutDifficulty = "beginner" | "intermediate" | "advanced" | "all-levels";
export type WorkoutGoal = "engine" | "strength" | "mobility" | "power" | "recovery";

export type CommunityWorkout = {
  id: string;
  title: string;
  goal: WorkoutGoal;
  durationMinutes: number;
  difficulty: WorkoutDifficulty;
  equipment: string[];
  summary: string;
  builderName: string;
  builderAvatarUrl: string | null;
  savedCount: number;
  blockCount: number;
  imageUrl: string | null;
  isOwnWorkout: boolean;
  isSavedByCurrentUser: boolean;
  createdAt: string;
  visibility: "community";
};

type CommunityExerciseRow = {
  image_urls?: string[] | null;
  structure_json?: { image_paths?: string[]; source_payload?: { storage_image_urls?: string[] } } | null;
};

type WorkoutRow = {
  id: string;
  title: string;
  goal: string | null;
  duration_minutes: number | null;
  difficulty: string | null;
  equipment: string[] | null;
  visibility: string | null;
  intake_summary: string | null;
  created_at: string | null;
  user_id: string | null;
  workout_items?: Array<{ id: string; order_index: number | null; block_type: string | null; exercises: CommunityExerciseRow | null }> | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

const goalFallbacks: WorkoutGoal[] = ["engine", "strength", "mobility", "power", "recovery"];

const authorFallbacks = new Map<string, ProfileRow>([
  [
    "40c51b18-0374-4ad5-8b99-542430951722",
    {
      id: "40c51b18-0374-4ad5-8b99-542430951722",
      email: "claw-demo@oracleboxing.local",
      first_name: "Open",
      last_name: "Claw",
      display_name: "Open Claw",
      avatar_url: "https://rabudzkpputmollmpodd.supabase.co/storage/v1/object/public/profile-images/40c51b18-0374-4ad5-8b99-542430951722/open-claw-logo.png?v=1778125026859",
    },
  ],
]);

function cleanGoal(goal: string | null | undefined, id: string): WorkoutGoal {
  const normalized = goal?.toLowerCase().trim();
  if (normalized === "engine" || normalized === "strength" || normalized === "mobility" || normalized === "power" || normalized === "recovery") {
    return normalized;
  }

  const hash = id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return goalFallbacks[hash % goalFallbacks.length];
}

function cleanDifficulty(difficulty: string | null | undefined): WorkoutDifficulty {
  const normalized = difficulty?.toLowerCase().trim();
  if (normalized === "beginner" || normalized === "intermediate" || normalized === "advanced" || normalized === "all-levels") {
    return normalized;
  }
  return "all-levels";
}

function displayName(profile?: ProfileRow | null) {
  if (!profile) return "Oracle member";
  return profile.display_name || [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email?.split("@")[0] || "Oracle member";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function imageUrls(exercise: CommunityExerciseRow | null): string[] {
  if (!exercise) return [];
  return [...new Set([...stringArray(exercise.image_urls), ...stringArray(exercise.structure_json?.image_paths), ...stringArray(exercise.structure_json?.source_payload?.storage_image_urls)].filter((url) => /^https?:\/\//i.test(url)))];
}

function communityImageUrl(row: WorkoutRow) {
  const items = [...(row.workout_items ?? [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  const preferred = items.find((item) => ["strength", "main", "conditioning"].includes(item.block_type ?? "") && imageUrls(item.exercises)[0]) ?? items.find((item) => imageUrls(item.exercises)[0]);
  return preferred ? imageUrls(preferred.exercises)[0] ?? null : null;
}

function toCommunityWorkout(row: WorkoutRow, userId?: string, profile?: ProfileRow | null, savedIds = new Set<string>()): CommunityWorkout {
  return {
    id: row.id,
    title: row.title,
    goal: cleanGoal(row.goal, row.id),
    durationMinutes: row.duration_minutes ?? 30,
    difficulty: cleanDifficulty(row.difficulty),
    equipment: row.equipment?.length ? row.equipment : ["Bodyweight"],
    summary: "Workout attached",
    builderName: displayName(profile),
    builderAvatarUrl: profile?.avatar_url ?? null,
    savedCount: 0,
    blockCount: row.workout_items?.length ?? 0,
    imageUrl: communityImageUrl(row),
    isOwnWorkout: Boolean(userId && row.user_id === userId),
    isSavedByCurrentUser: savedIds.has(row.id),
    createdAt: row.created_at ?? new Date().toISOString(),
    visibility: "community",
  };
}

export type CommunityWorkoutSource = {
  workouts: CommunityWorkout[];
  source: "supabase" | "mock";
  note: string | null;
};

export async function getCommunityWorkouts(currentUserId?: string): Promise<CommunityWorkoutSource> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("workouts")
      .select(`id,title,goal,duration_minutes,difficulty,equipment,visibility,intake_summary,created_at,user_id,
        workout_items(id,order_index,block_type,exercises(image_urls,structure_json))`)
      .eq("visibility", "community")
      .order("created_at", { ascending: false })
      .limit(60);

    if (error) throw new Error(error.message);

    const rows = (data ?? []) as unknown as WorkoutRow[];
    const userIds = [...new Set(rows.map((row) => row.user_id).filter((id): id is string => Boolean(id)))];
    const profilesById = new Map<string, ProfileRow>();

    if (userIds.length) {
      const { data: profiles } = await getServerSupabaseClient()
        .from("profiles")
        .select("id,display_name,first_name,last_name,email,avatar_url")
        .in("id", userIds);

      for (const profile of (profiles ?? []) as ProfileRow[]) {
        profilesById.set(profile.id, profile);
      }
    }

    const savedIds = new Set<string>();
    const saveCounts = new Map<string, number>();
    if (rows.length) {
      const markers = rows.map((row) => `shared-workout-copy:${row.id}`);
      const { data: allSavedCopies } = await getServerSupabaseClient()
        .from("workouts")
        .select("user_id,ai_model")
        .in("ai_model", markers);

      for (const copy of (allSavedCopies ?? []) as Array<{ user_id: string | null; ai_model: string | null }>) {
        const id = copy.ai_model?.replace("shared-workout-copy:", "");
        if (!id) continue;
        saveCounts.set(id, (saveCounts.get(id) ?? 0) + 1);
        if (currentUserId && copy.user_id === currentUserId) savedIds.add(id);
      }
    }

    const workouts = rows.map((row) => ({
      ...toCommunityWorkout(row, currentUserId, row.user_id ? profilesById.get(row.user_id) ?? authorFallbacks.get(row.user_id) : null, savedIds),
      savedCount: saveCounts.get(row.id) ?? 0,
    }));

    return { workouts, source: "supabase", note: null };
  } catch {
    return { workouts: [], source: "supabase", note: null };
  }
}
