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

export const communityFallbackWorkouts: CommunityWorkout[] = [
  {
    id: "mock-boxer-engine-35",
    title: "Boxer Engine 35",
    goal: "engine",
    durationMinutes: 35,
    difficulty: "intermediate",
    equipment: ["Dumbbells", "Skipping rope", "Mat"],
    summary: "Round-based conditioning with legs, trunk rotation and a shoulder-safe finisher.",
    builderName: "Oracle Lab",
    savedCount: 42,
    blockCount: 5,
    createdAt: "2026-05-01T10:00:00.000Z",
    visibility: "community",
  },
  {
    id: "mock-hotel-room-fight-fit",
    title: "Hotel Room Fight Fit",
    goal: "mobility",
    durationMinutes: 25,
    difficulty: "beginner",
    equipment: ["Bodyweight", "Towel"],
    summary: "Travel-week movement quality, trunk work and low-noise conditioning. No daft burpee circus.",
    builderName: "Maya R.",
    savedCount: 28,
    blockCount: 4,
    createdAt: "2026-05-02T08:30:00.000Z",
    visibility: "community",
  },
  {
    id: "mock-heavy-legs-light-bag",
    title: "Heavy Legs, Light Bag Day",
    goal: "recovery",
    durationMinutes: 30,
    difficulty: "all-levels",
    equipment: ["Resistance band", "Mat"],
    summary: "Downshift after hard boxing. Hips, calves, fascia, breathwork and enough core to stay honest.",
    builderName: "Coach approved",
    savedCount: 19,
    blockCount: 4,
    createdAt: "2026-05-03T12:15:00.000Z",
    visibility: "community",
  },
  {
    id: "mock-shoulder-armor-alpha",
    title: "Shoulder Armor Alpha",
    goal: "strength",
    durationMinutes: 40,
    difficulty: "intermediate",
    equipment: ["Bands", "Dumbbells", "Bench"],
    summary: "Scap control, trunk stiffness and pressing capacity without abusing the front delt.",
    builderName: "Ollie L.",
    savedCount: 35,
    blockCount: 6,
    createdAt: "2026-04-30T16:00:00.000Z",
    visibility: "community",
  },
  {
    id: "mock-rotational-power",
    title: "Rotational Power Primer",
    goal: "power",
    durationMinutes: 32,
    difficulty: "advanced",
    equipment: ["Medicine ball", "Cable", "Mat"],
    summary: "Explosive hips, anti-rotation and short bursts built for sharper punching mechanics.",
    builderName: "Oracle Lab",
    savedCount: 51,
    blockCount: 5,
    createdAt: "2026-04-28T14:20:00.000Z",
    visibility: "community",
  },
];

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

    if (error) {
      return {
        workouts: communityFallbackWorkouts,
        source: "mock",
        note: `Using mock gallery because Supabase community workouts are not ready yet: ${error.message}`,
      };
    }

    const workouts = (data ?? []).map((row) => toCommunityWorkout(row as WorkoutRow));

    if (!workouts.length) {
      return {
        workouts: communityFallbackWorkouts,
        source: "mock",
        note: "No community workouts found yet. Showing typed seed examples so the gallery has shape before generated workouts land.",
      };
    }

    return { workouts, source: "supabase", note: null };
  } catch (error) {
    return {
      workouts: communityFallbackWorkouts,
      source: "mock",
      note: error instanceof Error ? `Using mock gallery: ${error.message}` : "Using mock gallery until Supabase is configured.",
    };
  }
}
