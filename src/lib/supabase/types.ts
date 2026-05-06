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
  force?: string | null;
  mechanic?: string | null;
  source_equipment?: string | null;
  primary_muscles?: string[] | null;
  secondary_muscles?: string[] | null;
  image_urls?: string[] | null;
  movement_patterns?: string[] | null;
  boxing_qualities?: string[] | null;
  boxing_snc_roles?: string[] | null;
  boxing_snc_adaptations?: string[] | null;
  boxing_snc_movement_families?: string[] | null;
  boxing_snc_body_regions?: string[] | null;
  boxing_snc_equipment_fit?: Json | null;
  boxing_snc_scores?: Json | null;
  boxing_snc_prescription?: Json | null;
  boxing_snc_notes?: string | null;
  boxing_snc_version?: string | null;
  boxing_snc_model?: string | null;
  boxing_snc_enriched_at?: string | null;
  structure_json: ExerciseStructureJson | null;
  is_active: boolean | null;
  is_curated: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

export type MemberAccessRow = {
  user_id: string;
  email?: string | null;
  tier: string;
  source: string;
  active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export type ProfileRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
  updated_at?: string | null;
};

export type WorkoutRow = {
  id: string;
  user_id: string;
  title: string;
  goal: string | null;
  duration_minutes: number | null;
  difficulty: string | null;
  equipment: string[] | null;
  visibility: "private" | "community" | string;
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

export type WorkoutChatSessionRow = {
  id: string;
  user_id: string;
  workout_id: string | null;
  title: string | null;
  status: "active" | "completed" | "archived";
  intake_summary: Json | null;
  created_at: string | null;
  updated_at: string | null;
};

export type WorkoutChatMessageRow = {
  id: string;
  session_id: string;
  user_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata: Json | null;
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
      workout_chat_sessions: {
        Row: WorkoutChatSessionRow;
        Insert: Partial<WorkoutChatSessionRow> & Pick<WorkoutChatSessionRow, "user_id">;
        Update: Partial<WorkoutChatSessionRow>;
      };
      workout_chat_messages: {
        Row: WorkoutChatMessageRow;
        Insert: Partial<WorkoutChatMessageRow> & Pick<WorkoutChatMessageRow, "session_id" | "user_id" | "role" | "content">;
        Update: Partial<WorkoutChatMessageRow>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
