import { createClient } from "@/lib/supabase/server";

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
  savedCount: number;
  blockCount: number;
  createdAt: string;
  visibility: "community";
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
  workout_items?: { id: string }[] | null;
};

const goalFallbacks: WorkoutGoal[] = ["engine", "strength", "mobility", "power", "recovery"];

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

function displayName() {
  return "Oracle member";
}

function toCommunityWorkout(row: WorkoutRow): CommunityWorkout {
  return {
    id: row.id,
    title: row.title,
    goal: cleanGoal(row.goal, row.id),
    durationMinutes: row.duration_minutes ?? 30,
    difficulty: cleanDifficulty(row.difficulty),
    equipment: row.equipment?.length ? row.equipment : ["Bodyweight"],
    summary: row.intake_summary?.trim() || "A member-built conditioning session shared with the Oracle community.",
    builderName: displayName(),
    savedCount: 0,
    blockCount: row.workout_items?.length ?? 0,
    createdAt: row.created_at ?? new Date().toISOString(),
    visibility: "community",
  };
}

export type CommunityWorkoutSource = {
  workouts: CommunityWorkout[];
  source: "supabase" | "mock";
  note: string | null;
};

export async function getCommunityWorkouts(): Promise<CommunityWorkoutSource> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("workouts")
      .select("id,title,goal,duration_minutes,difficulty,equipment,visibility,intake_summary,created_at,user_id,workout_items(id)")
      .eq("visibility", "community")
      .order("created_at", { ascending: false })
      .limit(60);

    if (error) throw new Error(error.message);

    const workouts = (data ?? []).map((row) => toCommunityWorkout(row as WorkoutRow));

    return { workouts, source: "supabase", note: null };
  } catch {
    return { workouts: [], source: "supabase", note: null };
  }
}
