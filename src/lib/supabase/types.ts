export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ExerciseStructureJson = {
  source?: string;
  source_id?: string | null;
  force?: string | null;
  mechanic?: string | null;
  primary_muscles?: string[];
  secondary_muscles?: string[];
  image_paths?: string[];
  source_payload?: {
    id?: string;
    name?: string;
    force?: string | null;
    level?: string | null;
    mechanic?: string | null;
    equipment?: string | null;
    category?: string | null;
    primaryMuscles?: string[];
    secondaryMuscles?: string[];
    instructions?: string[];
    images?: string[];
    storage_image_urls?: string[];
    [key: string]: Json | undefined;
  };
  [key: string]: Json | undefined;
};

export type ExerciseRow = {
  id: string;
  title: string;
  slug: string | null;
  discipline: string | null;
  item_type: string | null;
  category: string | null;
  summary: string | null;
  description: string | null;
  instructions_json: Json | null;
  coaching_cues_json: Json | null;
  common_mistakes_json: Json | null;
  equipment_tags: string[] | null;
  difficulty: string | null;
  structure_json: ExerciseStructureJson | null;
  is_active: boolean | null;
  is_curated: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

export type MemberAccessRow = {
  user_id: string;
  tier: string;
  source: string;
  active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
};

export type WorkoutRow = {
  id: string;
  user_id: string;
  title: string;
  goal: string | null;
  duration_minutes: number | null;
  difficulty: string | null;
  equipment: string[] | null;
  visibility: "private" | "community";
  intake_summary: string | null;
  ai_model: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type WorkoutItemRow = {
  id: string;
  workout_id: string;
  exercise_id: string | null;
  order_index: number;
  block_type: string;
  block_title: string | null;
  sets: number | null;
  reps: string | null;
  duration_seconds: number | null;
  rest_seconds: number | null;
  tempo: string | null;
  coaching_note: string | null;
  created_at: string | null;
};

export type Database = {
  public: {
    Tables: {
      exercises: {
        Row: ExerciseRow;
        Insert: Partial<ExerciseRow> & Pick<ExerciseRow, "title">;
        Update: Partial<ExerciseRow>;
      };
      member_access: {
        Row: MemberAccessRow;
        Insert: Partial<MemberAccessRow> & Pick<MemberAccessRow, "user_id">;
        Update: Partial<MemberAccessRow>;
      };
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & Pick<ProfileRow, "id">;
        Update: Partial<ProfileRow>;
      };
      workouts: {
        Row: WorkoutRow;
        Insert: Partial<WorkoutRow> & Pick<WorkoutRow, "user_id" | "title">;
        Update: Partial<WorkoutRow>;
      };
      workout_items: {
        Row: WorkoutItemRow;
        Insert: Partial<WorkoutItemRow> & Pick<WorkoutItemRow, "workout_id" | "order_index" | "block_type">;
        Update: Partial<WorkoutItemRow>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
