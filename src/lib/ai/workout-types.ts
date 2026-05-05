import type { CompactExercise } from "@/lib/exercises/search";

export type WorkoutIntake = {
  goal: string | null;
  equipment: string[];
  timeMinutes: number | null;
  level: "beginner" | "intermediate" | "advanced" | "unknown" | null;
  injuriesOrConstraints: string | null;
  boxingFocus: string | null;
  trainingEnvironment: string | null;
  recentTrainingOrFatigue: string | null;
  preferredIntensity: string | null;
  whatToAvoid: string | null;
  sessionBias: "strength" | "power" | "conditioning" | "mobility" | "mixed" | "unknown" | null;
  targetMuscles: string[];
  targetMovementPatterns: string[];
};

export type WorkoutChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type GeneratedWorkoutItem = {
  itemId?: string;
  exerciseId: string;
  exercise?: CompactExercise;
  sets: number | null;
  reps: string | null;
  durationSeconds: number | null;
  restSeconds: number | null;
  tempo: string | null;
  coachingNote: string;
};

export type GeneratedWorkoutBlock = {
  type: "warmup" | "strength" | "conditioning" | "core" | "mobility" | "cooldown";
  title: string;
  items: GeneratedWorkoutItem[];
};

export type GeneratedWorkout = {
  title: string;
  summary: string;
  durationMinutes: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  equipment: string[];
  blocks: GeneratedWorkoutBlock[];
  safetyNotes: string[];
  progressionNote: string;
};

export type WorkoutEditPatchOperation =
  | {
      op: "update_workout_meta";
      title?: string;
      summary?: string;
      durationMinutes?: number;
      difficulty?: GeneratedWorkout["difficulty"];
      equipment?: string[];
      safetyNotes?: string[];
      progressionNote?: string;
    }
  | {
      op: "update_block";
      blockIndex: number;
      type?: GeneratedWorkout["blocks"][number]["type"];
      title?: string;
    }
  | {
      op: "update_item" | "replace_exercise";
      blockIndex: number;
      itemIndex: number;
      exerciseId?: string;
      sets?: number | null;
      reps?: string | null;
      durationSeconds?: number | null;
      restSeconds?: number | null;
      tempo?: string | null;
      coachingNote?: string;
    }
  | {
      op: "remove_item";
      blockIndex: number;
      itemIndex: number;
    }
  | {
      op: "add_item";
      blockIndex: number;
      position?: number;
      item: Omit<GeneratedWorkoutItem, "exercise" | "itemId">;
    };

export type WorkoutEditPatch = {
  summary?: string;
  operations: WorkoutEditPatchOperation[];
};

export type WorkoutPersistence = {
  status: "saved" | "preview_only";
  workoutId?: string;
  reason?: string;
};
