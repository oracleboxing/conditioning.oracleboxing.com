export type WorkoutVisibility = "private" | "community";
export type WorkoutBlockType = "warmup" | "strength" | "conditioning" | "core" | "mobility" | "cooldown" | "main" | "finisher";

export type WorkoutExercise = {
  id: string;
  name: string;
  category: string | null;
  imageUrl: string | null;
  imageUrls: string[];
  equipment: string[];
  instructions: string[];
};

export type WorkoutItem = {
  id: string;
  orderIndex: number;
  blockType: WorkoutBlockType;
  blockTitle: string;
  exercise: WorkoutExercise;
  sets: number | null;
  reps: string | null;
  durationSeconds: number | null;
  restSeconds: number | null;
  tempo: string | null;
  coachingNote: string | null;
  coachingCues: string[];
  boxingRelevance: string | null;
};

export type WorkoutSection = {
  type: WorkoutBlockType;
  title: string;
  eyebrow: string;
  description: string;
  items: WorkoutItem[];
};

export type WorkoutDisplay = {
  id: string;
  chatSessionId: string | null;
  title: string;
  goal: string | null;
  durationMinutes: number | null;
  difficulty: string | null;
  equipment: string[];
  visibility: WorkoutVisibility;
  isOwnWorkout: boolean;
  isSavedByCurrentUser: boolean;
  sharedSourceWorkoutId: string | null;
  intakeSummary: string | null;
  createdAt: string | null;
  sections: WorkoutSection[];
};
