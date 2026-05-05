import { NextRequest } from "next/server";
import {
  ensureChatSession,
  loadChatSession,
  persistChatMessage,
  titleFromIntake,
  updateChatSession,
  type AuthSupabase,
} from "@/lib/ai/chat-history";
import {
  extractIntake,
  gatherExerciseCandidates,
  generateWorkout,
  missingIntakeQuestions,
  saveWorkoutForUser,
  validateWorkoutExercises,
} from "@/lib/ai/workout-creator";
import type { WorkoutChatMessage, WorkoutIntake } from "@/lib/ai/workout-types";
import { createAuthClient } from "@/lib/supabase/auth-server";
export const dynamic = "force-dynamic";

type RequestBody = {
  sessionId?: string | null;
  messages?: WorkoutChatMessage[];
  intake?: Partial<WorkoutIntake>;
};

function cleanSessionId(value: unknown) {
  return typeof value === "string" && /^[0-9a-f-]{32,36}$/i.test(value) ? value : null;
}

function cleanMessages(messages: unknown): WorkoutChatMessage[] {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((message): message is WorkoutChatMessage => {
      if (!message || typeof message !== "object") return false;
      const candidate = message as WorkoutChatMessage;
      return (candidate.role === "user" || candidate.role === "assistant") && typeof candidate.content === "string";
    })
    .map((message) => ({ role: message.role, content: message.content.slice(0, 2000) }))
    .slice(-16);
}

function questionMessage(questions: string[]) {
  if (questions.length === 1) return questions[0];
  return questions.join("\n");
}

function latestUserMessage(messages: WorkoutChatMessage[]) {
  return [...messages].reverse().find((message) => message.role === "user") ?? null;
}

async function authenticatedSupabase() {
  const supabase = (await createAuthClient()) as AuthSupabase;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await authenticatedSupabase();

    if (!user) {
      return Response.json({ error: "unauthorized", message: "Sign in before loading chats." }, { status: 401 });
    }

    const sessionId = cleanSessionId(request.nextUrl.searchParams.get("sessionId"));
    if (!sessionId) {
      return Response.json({ error: "missing_session_id", message: "Provide a valid sessionId." }, { status: 400 });
    }

    const { session, messages, warning } = await loadChatSession(supabase, user.id, sessionId);
    if (!session) {
      return Response.json({ error: "chat_session_not_found", message: warning ?? "Chat session was not found." }, { status: 404 });
    }

    return Response.json({ sessionId: session.id, session, messages, warning });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workout chat load failed.";
    return Response.json({ error: "workout_chat_load_failed", message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await authenticatedSupabase();

    if (!user) {
      return Response.json({ error: "unauthorized", message: "Sign in before creating workouts." }, { status: 401 });
    }

    const body = (await request.json()) as RequestBody;
    const messages = cleanMessages(body.messages);
    const userMessage = latestUserMessage(messages);
    let sessionId = cleanSessionId(body.sessionId);
    const chatWarnings: string[] = [];

    if (!userMessage) {
      const questions = ["What do you want this workout to achieve today?", "What equipment have you got?"];
      return Response.json({ type: "question", sessionId, message: questionMessage(questions), questions, intake: body.intake ?? null });
    }

    const session = await ensureChatSession(supabase, user.id, sessionId, userMessage.content);
    sessionId = session.sessionId;
    if (session.warning) chatWarnings.push(session.warning);

    const userPersistWarning = await persistChatMessage(supabase, user.id, sessionId, userMessage, { source: "workout_creator" });
    if (userPersistWarning) chatWarnings.push(userPersistWarning);

    const intake = await extractIntake(messages, body.intake);
    const questions = missingIntakeQuestions(intake);
    const title = titleFromIntake(intake, userMessage.content);

    if (questions.length) {
      const assistantMessage = questionMessage(questions);
      const assistantPersistWarning = await persistChatMessage(supabase, user.id, sessionId, { role: "assistant", content: assistantMessage }, { type: "question" });
      const updateWarning = await updateChatSession(supabase, user.id, sessionId, { intake, title, status: "active" });
      if (assistantPersistWarning) chatWarnings.push(assistantPersistWarning);
      if (updateWarning) chatWarnings.push(updateWarning);

      return Response.json({ type: "question", sessionId, message: assistantMessage, questions, intake, chatWarnings });
    }

    const candidates = await gatherExerciseCandidates(intake);
    const workout = await generateWorkout(intake, candidates);
    const validated = await validateWorkoutExercises(workout, candidates);
    const persistence = await saveWorkoutForUser(user.id, intake, validated.workout);
    const assistantMessage = persistence.status === "saved" ? "Workout built and saved." : "Workout built as a preview.";

    const assistantPersistWarning = await persistChatMessage(supabase, user.id, sessionId, { role: "assistant", content: assistantMessage }, { type: "workout", workoutId: persistence.workoutId ?? null });
    const updateWarning = await updateChatSession(supabase, user.id, sessionId, {
      intake,
      title: validated.workout.title,
      status: persistence.status === "saved" ? "completed" : "active",
      workoutId: persistence.workoutId ?? null,
    });
    if (assistantPersistWarning) chatWarnings.push(assistantPersistWarning);
    if (updateWarning) chatWarnings.push(updateWarning);

    return Response.json({
      type: "workout",
      sessionId,
      message: assistantMessage,
      intake,
      workout: validated.workout,
      warnings: validated.warnings,
      chatWarnings,
      persistence,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workout chat failed.";
    return Response.json({ error: "workout_chat_failed", message }, { status: 500 });
  }
}
