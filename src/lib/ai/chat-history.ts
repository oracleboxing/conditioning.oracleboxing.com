import type { Database, Json, WorkoutChatMessageRow, WorkoutChatSessionRow } from "@/lib/supabase/types";
import type { WorkoutChatMessage, WorkoutIntake } from "@/lib/ai/workout-types";

const CHAT_TABLE_MISSING_CODES = new Set(["42P01", "PGRST205", "PGRST202"]);

type SupabaseErrorLike = { code?: string; message?: string } | null;
// The auth client is created without project-generated Supabase generics in this app,
// so chat history helpers keep the client structural and cast query results at the edge.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AuthSupabase = any;

export type ChatPersistenceState = {
  sessionId: string | null;
  available: boolean;
  warning?: string;
};

export type ChatSessionSummary = Pick<WorkoutChatSessionRow, "id" | "workout_id" | "title" | "status" | "intake_summary" | "created_at" | "updated_at">;

function isChatHistoryMissing(error: SupabaseErrorLike) {
  if (!error) return false;
  if (error.code && CHAT_TABLE_MISSING_CODES.has(error.code)) return true;
  const message = error.message?.toLowerCase() ?? "";
  return message.includes("workout_chat_") && (message.includes("does not exist") || message.includes("schema cache"));
}

function warningFrom(error: SupabaseErrorLike) {
  if (isChatHistoryMissing(error)) return "Chat history tables are not available yet. Apply supabase/chat-history-mvp.sql to enable persistent history.";
  return error?.message ? `Chat history persistence failed: ${error.message}` : "Chat history persistence failed.";
}

function cleanTitle(value: string) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return "Workout chat";
  return compact.length > 64 ? `${compact.slice(0, 61).trim()}...` : compact;
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeTitleToken(value: string) {
  return value.replace(/[-_]+/g, " ").replace(/\bfocused\b/gi, "").replace(/\s+/g, " ").trim();
}

function primaryFocusFrom(intake: WorkoutIntake) {
  const focusText = `${intake.goal ?? ""} ${intake.boxingFocus ?? ""} ${intake.sessionBias ?? ""} ${intake.targetMuscles.join(" ")} ${intake.targetMovementPatterns.join(" ")}`.toLowerCase();

  if (focusText.includes("glute") || focusText.includes("hip")) return "Glutes";
  if (/\b(ab+s?|abdominals?|core|trunk|obliques?)\b/.test(focusText)) return "Core";
  if (/\b(leg|quad|hamstring|calf|footwork|feet)\b/.test(focusText)) return "Legs";
  if (/\b(shoulder|rotator|scap)\b/.test(focusText)) return "Shoulders";
  if (/\b(chest|pec)\b/.test(focusText)) return "Chest";
  if (/\b(back|lat|row|pull)\b/.test(focusText)) return "Back";
  if (/\b(power|explosive|punch)\b/.test(focusText)) return "Power";
  if (/\b(conditioning|engine|gas|cardio|stamina)\b/.test(focusText)) return "Conditioning";
  if (/\b(mobility|recovery|stretch)\b/.test(focusText)) return "Mobility";

  const fallback = normalizeTitleToken(intake.goal ?? intake.boxingFocus ?? "");
  return fallback ? titleCase(fallback) : null;
}

function equipmentTitle(equipment: string[]) {
  if (!equipment.length) return null;
  const normalized = equipment.map((item) => item.trim().toLowerCase()).filter(Boolean);
  if (normalized.some((item) => /full gym|commercial gym|gym access|all equipment|any equipment/.test(item))) return "Full gym";
  if (normalized.includes("bodyweight")) return "Bodyweight";
  if (normalized.some((item) => /dumbbells?|dbs?/.test(item))) return "Dumbbells";
  if (normalized.some((item) => /kettlebells?|kbs?/.test(item))) return "Kettlebells";
  if (normalized.some((item) => /barbells?/.test(item))) return "Barbell";
  if (normalized.some((item) => /bands?|resistance bands?/.test(item))) return "Bands";
  return titleCase(normalizeTitleToken(normalized.slice(0, 2).join(", ")));
}

export function titleFromIntake(intake: WorkoutIntake, fallbackMessage?: string) {
  const parts = [
    primaryFocusFrom(intake),
    intake.timeMinutes ? `${intake.timeMinutes} min` : null,
    equipmentTitle(intake.equipment),
  ].filter((part): part is string => Boolean(part));

  return cleanTitle(parts.length ? parts.join(" · ") : fallbackMessage ?? "Workout chat");
}

export function jsonFromIntake(intake: WorkoutIntake): Json {
  return {
    goal: intake.goal,
    equipment: intake.equipment,
    timeMinutes: intake.timeMinutes,
    level: intake.level,
    injuriesOrConstraints: intake.injuriesOrConstraints,
    boxingFocus: intake.boxingFocus,
    trainingEnvironment: intake.trainingEnvironment,
    recentTrainingOrFatigue: intake.recentTrainingOrFatigue,
    preferredIntensity: intake.preferredIntensity,
    whatToAvoid: intake.whatToAvoid,
    sessionBias: intake.sessionBias,
    targetMuscles: intake.targetMuscles,
    targetMovementPatterns: intake.targetMovementPatterns,
  };
}

export async function ensureChatSession(supabase: AuthSupabase, userId: string, sessionId: string | null | undefined, fallbackTitle: string): Promise<ChatPersistenceState> {
  if (sessionId) {
    const { data, error } = await supabase.from("workout_chat_sessions").select("id").eq("id", sessionId).eq("user_id", userId).maybeSingle();
    const row = data as { id: string } | null;
    if (!error && row?.id) return { sessionId: row.id, available: true };
    return { sessionId: null, available: !isChatHistoryMissing(error), warning: warningFrom(error ?? { message: "Chat session was not found." }) };
  }

  const { data, error } = await supabase
    .from("workout_chat_sessions")
    .insert({ user_id: userId, title: cleanTitle(fallbackTitle), status: "active" })
    .select("id")
    .single();

  const row = data as { id: string } | null;
  if (error || !row?.id) return { sessionId: null, available: !isChatHistoryMissing(error), warning: warningFrom(error) };
  return { sessionId: row.id, available: true };
}

export async function persistChatMessage(supabase: AuthSupabase, userId: string, sessionId: string | null | undefined, message: WorkoutChatMessage, metadata: Json = {}) {
  if (!sessionId) return undefined;
  const { error } = await supabase.from("workout_chat_messages").insert({
    session_id: sessionId,
    user_id: userId,
    role: message.role,
    content: message.content,
    metadata,
  });
  return error ? warningFrom(error) : undefined;
}

export async function updateChatSession(
  supabase: AuthSupabase,
  userId: string,
  sessionId: string | null | undefined,
  values: { intake?: WorkoutIntake; title?: string; status?: WorkoutChatSessionRow["status"]; workoutId?: string | null },
) {
  if (!sessionId) return undefined;
  const update: Database["public"]["Tables"]["workout_chat_sessions"]["Update"] = { updated_at: new Date().toISOString() };
  if (values.intake) update.intake_summary = jsonFromIntake(values.intake);
  if (values.title) update.title = cleanTitle(values.title);
  if (values.status) update.status = values.status;
  if (values.workoutId !== undefined) update.workout_id = values.workoutId;

  const { error } = await supabase.from("workout_chat_sessions").update(update).eq("id", sessionId).eq("user_id", userId);
  return error ? warningFrom(error) : undefined;
}

export async function loadChatSession(supabase: AuthSupabase, userId: string, sessionId: string) {
  const { data: session, error: sessionError } = await supabase
    .from("workout_chat_sessions")
    .select("id,workout_id,title,status,intake_summary,created_at,updated_at")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  const sessionRow = session as ChatSessionSummary | null;

  if (sessionError) return { session: null, messages: [], warning: warningFrom(sessionError) };
  if (!sessionRow) return { session: null, messages: [], warning: "Chat session was not found." };

  const { data: messages, error: messagesError } = await supabase
    .from("workout_chat_messages")
    .select("id,role,content,metadata,created_at")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  return {
    session: sessionRow,
    messages: ((messages ?? []) as Pick<WorkoutChatMessageRow, "id" | "role" | "content" | "metadata" | "created_at">[]).filter(
      (message) => message.role === "user" || message.role === "assistant",
    ),
    warning: messagesError ? warningFrom(messagesError) : undefined,
  };
}

export async function listChatSessions(supabase: AuthSupabase, userId: string, limit = 20) {
  const { data, error } = await supabase
    .from("workout_chat_sessions")
    .select("id,workout_id,title,status,intake_summary,created_at,updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  return { sessions: (data ?? []) as ChatSessionSummary[], warning: error ? warningFrom(error) : undefined };
}
