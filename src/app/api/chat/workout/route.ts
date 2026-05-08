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
  applyWorkoutAssumptions,
  extractIntake,
  gatherExerciseCandidates,
  editWorkoutWithInstruction,
  generateWorkout,
  loadGeneratedWorkoutForUser,
  nextCoachQuestion,
  saveWorkoutForUser,
  streamWorkoutAssumptions,
  swapWorkoutExercise,
  updateWorkoutForUser,
  updateWorkoutForUserWithPatch,
  validateWorkoutExercises,
} from "@/lib/ai/workout-creator";
import type { GeneratedWorkout, WorkoutChatMessage, WorkoutIntake } from "@/lib/ai/workout-types";
import { createAuthClient } from "@/lib/supabase/auth-server";

export const dynamic = "force-dynamic";

type RequestBody = {
  mode?: "chat" | "edit" | "swap" | "save";
  sessionId?: string | null;
  messages?: WorkoutChatMessage[];
  intake?: Partial<WorkoutIntake>;
  workout?: GeneratedWorkout | null;
  rejectedExerciseIds?: string[];
  instruction?: string;
};

type StreamEvent =
  | { type: "session"; sessionId: string; warnings: string[] }
  | { type: "intake"; intake: WorkoutIntake }
  | { type: "question"; message: string; questions: string[] }
  | { type: "token"; content: string }
  | { type: "status"; message: string }
  | { type: "debug"; label: string; data: unknown }
  | { type: "workout"; workout: GeneratedWorkout; warnings: string[]; persistence?: Awaited<ReturnType<typeof saveWorkoutForUser>> }
  | { type: "saved"; persistence: Awaited<ReturnType<typeof saveWorkoutForUser>> }
  | { type: "done" }
  | { type: "error"; message: string };

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
    .slice(-20);
}

function cleanRejectedIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length < 80).slice(0, 40);
}

function questionMessage(questions: string[]) {
  return questions.join("\n");
}

async function streamAssistantMessage(send: (event: StreamEvent) => void, message: string) {
  const chunks = message.match(/.{1,24}(\s|$)/g) ?? [message];
  for (const chunk of chunks) {
    send({ type: "token", content: chunk });
    await new Promise((resolve) => setTimeout(resolve, 12));
  }
}


function hasExplicitPreGenerationHold(message: string) {
  const lower = message.toLowerCase().replace(/\s+/g, " ");
  const buildVerb = "(?:write|writing|generate|generating|create|creating|build|building|make|making|draft|drafting|do)";
  const beforeBuild = new RegExp(`\\b(before|prior to)\\b.{0,80}\\b${buildVerb}\\b`).test(lower);
  const wantsCheck = /\b(tell|ask|check|confirm|question|questions|need|needs|anything else|let me know)\b/.test(lower);
  const dontUntil = new RegExp(`\\b(don't|dont|do not)\\b.{0,50}\\b${buildVerb}\\b.{0,80}\\b(until|before)\\b`).test(lower);
  const askBefore = new RegExp(`\\b(ask|check|confirm)\\b.{0,40}\\b(me|with me)\\b.{0,80}\\bbefore\\b.{0,80}\\b${buildVerb}\\b`).test(lower);

  return (beforeBuild && wantsCheck) || dontUntil || askBefore;
}

function preGenerationHoldQuestion(intake: WorkoutIntake, missingQuestions: string[], latestMessage = "") {
  if (missingQuestions.length) return questionMessage(missingQuestions);

  if (!intake.preferredIntensity && !intake.recentTrainingOrFatigue) {
    return "Before I write it, quick check: should this be controlled, hard, or low-impact today?";
  }

  if (!intake.whatToAvoid || /none stated|unknown/i.test(intake.whatToAvoid)) {
    return "Before I write it, anything you want me to avoid? Short answer is fine.";
  }

  const focus = latestMessage.trim() ? ` from “${latestMessage.trim().slice(0, 120)}”` : " from that info";
  return `Before I write it, confirm you’re happy for me to build it${focus}.`;
}

function latestUserMessage(messages: WorkoutChatMessage[]) {
  return [...messages].reverse().find((message) => message.role === "user") ?? null;
}


function workoutIdFromMessageMetadata(messages: Awaited<ReturnType<typeof loadChatSession>>["messages"]) {
  for (const message of [...messages].reverse()) {
    const metadata = message.metadata;
    if (!metadata || Array.isArray(metadata) || typeof metadata !== "object") continue;
    const workoutId = (metadata as { workoutId?: unknown }).workoutId;
    if (typeof workoutId === "string" && /^[0-9a-f-]{32,36}$/i.test(workoutId)) return workoutId;
  }
  return null;
}

async function authenticatedSupabase() {
  const supabase = (await createAuthClient()) as AuthSupabase;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

function workoutStream(producer: (send: (event: StreamEvent) => void) => Promise<void>) {
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      async start(controller) {
        const send = (event: StreamEvent) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        };

        try {
          await producer(send);
        } catch (error) {
          send({ type: "error", message: error instanceof Error ? error.message : "Workout chat failed." });
        } finally {
          controller.close();
        }
      },
    }),
    {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    },
  );
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

    const resolvedWorkoutId = session.workout_id ?? workoutIdFromMessageMetadata(messages);
    const workout = resolvedWorkoutId ? await loadGeneratedWorkoutForUser(user.id, resolvedWorkoutId) : null;
    return Response.json(
      { sessionId: session.id, session: { ...session, workout_id: resolvedWorkoutId }, messages, workout, warning },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workout chat load failed.";
    return Response.json({ error: "workout_chat_load_failed", message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await authenticatedSupabase();

  if (!user) {
    return Response.json({ error: "unauthorized", message: "Sign in before creating workouts." }, { status: 401 });
  }

  const body = (await request.json()) as RequestBody;
  const mode = body.mode ?? "chat";
  const messages = cleanMessages(body.messages);
  const userMessage = latestUserMessage(messages);
  let sessionId = cleanSessionId(body.sessionId);
  const rejectedExerciseIds = cleanRejectedIds(body.rejectedExerciseIds);

  if (mode === "save") {
    if (!body.workout || !body.intake) {
      return Response.json({ error: "missing_workout", message: "Generate a workout before saving." }, { status: 400 });
    }

    const intake = applyWorkoutAssumptions(body.intake as WorkoutIntake);
    const candidates = await gatherExerciseCandidates(intake, rejectedExerciseIds);
    const validated = await validateWorkoutExercises(body.workout, candidates);
    const persistence = await saveWorkoutForUser(user.id, intake, validated.workout);

    if (sessionId) {
      const assistantMessage = persistence.status === "saved" ? "Workout approved and saved." : "Workout approved, but saved as preview only.";
      await persistChatMessage(supabase, user.id, sessionId, { role: "assistant", content: assistantMessage }, { type: "workout", workoutId: persistence.workoutId ?? null });
      await updateChatSession(supabase, user.id, sessionId, {
        intake,
        title: validated.workout.title,
        status: persistence.status === "saved" ? "completed" : "active",
        workoutId: persistence.workoutId ?? null,
      });
    }

    return Response.json({ type: "saved", workout: validated.workout, warnings: validated.warnings, persistence });
  }

  return workoutStream(async (send) => {
    const chatWarnings: string[] = [];

    if (!userMessage && mode === "chat") {
      const questions = ["What are we building today? Give me the boxing problem, time, kit, and anything sore or off-limits."];
      const message = questionMessage(questions);
      await streamAssistantMessage(send, message);
      send({ type: "question", message: "", questions });
      send({ type: "done" });
      return;
    }

    if (userMessage) {
      const session = await ensureChatSession(supabase, user.id, sessionId, userMessage.content);
      sessionId = session.sessionId;
      if (session.warning) chatWarnings.push(session.warning);
      if (sessionId) send({ type: "session", sessionId, warnings: chatWarnings });

      const userPersistWarning = await persistChatMessage(supabase, user.id, sessionId, userMessage, { source: "workout_creator" });
      if (userPersistWarning) chatWarnings.push(userPersistWarning);
    }


    if (mode === "edit") {
      if (!body.workout && !sessionId) throw new Error("Open a saved workout before editing.");
      const extracted = await extractIntake(messages, body.intake);
      const intake = applyWorkoutAssumptions(extracted);
      send({ type: "intake", intake });

      let workoutId: string | null = null;
      let currentWorkout = body.workout ?? null;
      if (sessionId) {
        const { session } = await loadChatSession(supabase, user.id, sessionId);
        workoutId = session?.workout_id ?? null;
        if (!currentWorkout && workoutId) currentWorkout = await loadGeneratedWorkoutForUser(user.id, workoutId);
      }
      if (!currentWorkout) throw new Error("I couldn't find the workout to edit.");

      send({ type: "status", message: "Updating workout" });
      const candidates = await gatherExerciseCandidates(intake, rejectedExerciseIds);
      const edited = await editWorkoutWithInstruction(intake, currentWorkout, candidates, userMessage?.content ?? body.instruction ?? "Update the workout.");
      send({ type: "debug", label: "workout_edit_patch", data: edited.patch });
      const validated = await validateWorkoutExercises(edited.workout, candidates);
      const patchWarnings = edited.warnings.length ? edited.warnings : [];
      let persistence = workoutId ? await updateWorkoutForUserWithPatch(user.id, workoutId, intake, currentWorkout, validated.workout, edited.patch) : await saveWorkoutForUser(user.id, intake, validated.workout);
      if (workoutId && persistence.status !== "saved") {
        send({ type: "debug", label: "workout_edit_patch_fallback", data: persistence.reason ?? "Patch persistence failed; falling back to full workout update." });
        persistence = await updateWorkoutForUser(user.id, workoutId, intake, validated.workout);
      }
      const savedWorkoutId = persistence.workoutId ?? workoutId ?? null;

      if (sessionId) {
        const assistantMessage = "Done. I updated the workout.";
        const assistantPersistWarning = await persistChatMessage(supabase, user.id, sessionId, { role: "assistant", content: assistantMessage }, { type: "workout_edit", workoutId: savedWorkoutId });
        const updateWarning = await updateChatSession(supabase, user.id, sessionId, { intake, title: validated.workout.title, status: "active", workoutId: savedWorkoutId });
        if (assistantPersistWarning) chatWarnings.push(assistantPersistWarning);
        if (updateWarning) chatWarnings.push(updateWarning);
      }

      send({ type: "token", content: "Done. I updated the workout." });
      send({ type: "workout", workout: validated.workout, warnings: [...patchWarnings, ...validated.warnings], persistence });
      send({ type: "done" });
      return;
    }

    if (mode === "swap") {      if (!body.workout || !body.intake) throw new Error("Generate a draft before swapping exercises.");
      const intake = applyWorkoutAssumptions(body.intake as WorkoutIntake);
      const candidates = await gatherExerciseCandidates(intake, rejectedExerciseIds);
      send({ type: "status", message: "Finding cleaner exercise swaps" });
      const swapped = await swapWorkoutExercise(intake, body.workout, candidates, rejectedExerciseIds, body.instruction ?? "Swap rejected exercises.");
      const validated = await validateWorkoutExercises(swapped, candidates);
      send({ type: "workout", workout: validated.workout, warnings: validated.warnings });
      send({ type: "done" });
      return;
    }

    const extracted = await extractIntake(messages, body.intake);
    const coachQuestion = nextCoachQuestion(extracted, userMessage?.content ?? "");
    const questions = coachQuestion.questions;
    const shouldHoldBeforeGenerating = userMessage ? hasExplicitPreGenerationHold(userMessage.content) : false;

    if (questions.length || shouldHoldBeforeGenerating) {
      const assistantMessage = shouldHoldBeforeGenerating ? preGenerationHoldQuestion(extracted, questions, userMessage?.content ?? "") : questionMessage(questions);
      if (sessionId) {
        const title = titleFromIntake(extracted, userMessage?.content ?? "Workout chat");
        const assistantPersistWarning = await persistChatMessage(supabase, user.id, sessionId, { role: "assistant", content: assistantMessage }, { type: "question", mode: coachQuestion.mode });
        const updateWarning = await updateChatSession(supabase, user.id, sessionId, { intake: extracted, title, status: "active" });
        if (assistantPersistWarning) chatWarnings.push(assistantPersistWarning);
        if (updateWarning) chatWarnings.push(updateWarning);
      }
      send({ type: "intake", intake: extracted });
      await streamAssistantMessage(send, assistantMessage);
      send({ type: "question", message: "", questions });
      send({ type: "done" });
      return;
    }

    const intake = applyWorkoutAssumptions(extracted);
    send({ type: "intake", intake });
    send({ type: "status", message: "Searching exercise library" });
    const candidates = await gatherExerciseCandidates(intake, rejectedExerciseIds);
    if (!candidates.length) throw new Error("No matching uploaded free-exercise-db exercises were found.");

    let streamedMessage = "";
    for await (const token of await streamWorkoutAssumptions(intake, candidates)) {
      streamedMessage += token;
      send({ type: "token", content: token });
    }

    send({ type: "status", message: "Building workout" });
    const workout = await generateWorkout(intake, candidates, rejectedExerciseIds);
    const validated = await validateWorkoutExercises(workout, candidates);
    const persistence = await saveWorkoutForUser(user.id, intake, validated.workout);

    if (sessionId) {
      const title = titleFromIntake(intake, userMessage?.content ?? validated.workout.title);
      const assistantPersistWarning = await persistChatMessage(supabase, user.id, sessionId, { role: "assistant", content: streamedMessage || "I built and saved the workout." }, { type: "workout_saved", workoutId: persistence.workoutId ?? null });
      const updateWarning = await updateChatSession(supabase, user.id, sessionId, { intake, title, status: "active", workoutId: persistence.workoutId ?? null });
      if (assistantPersistWarning) chatWarnings.push(assistantPersistWarning);
      if (updateWarning) chatWarnings.push(updateWarning);
    }

    send({ type: "workout", workout: validated.workout, warnings: validated.warnings, persistence });
    send({ type: "done" });
  });
}
