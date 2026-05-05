import type { CompactExercise } from "@/lib/exercises/search";

export type WorkoutIntake = {
  goal: string | null;
  equipment: string[];
  timeMinutes: number | null;
  level: "beginner" | "intermediate" | "advanced" | "unknown" | null;
  injuriesOrConstraints: string | null;
  boxingFocus: string | null;
};

export type WorkoutChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type GeneratedWorkoutItem = {
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

export type WorkoutPersistence = {
  status: "saved" | "preview_only";
  workoutId?: string;
  reason?: string;
};
