import { NextRequest } from "next/server";
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
  messages?: WorkoutChatMessage[];
  intake?: Partial<WorkoutIntake>;
};

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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createAuthClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "unauthorized", message: "Sign in before creating workouts." }, { status: 401 });
    }

    const body = (await request.json()) as RequestBody;
    const messages = cleanMessages(body.messages);

    if (!messages.some((message) => message.role === "user")) {
      const questions = ["What do you want this workout to achieve today?", "What equipment have you got?" ];
      return Response.json({ type: "question", message: questionMessage(questions), questions, intake: body.intake ?? null });
    }

    const intake = await extractIntake(messages, body.intake);
    const questions = missingIntakeQuestions(intake);

    if (questions.length) {
      return Response.json({ type: "question", message: questionMessage(questions), questions, intake });
    }

    const candidates = await gatherExerciseCandidates(intake);
    const workout = await generateWorkout(intake, candidates);
    const validated = await validateWorkoutExercises(workout, candidates);
    const persistence = await saveWorkoutForUser(user.id, intake, validated.workout);

    return Response.json({
      type: "workout",
      message: persistence.status === "saved" ? "Workout built and saved." : "Workout built as a preview.",
      intake,
      workout: validated.workout,
      warnings: validated.warnings,
      persistence,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workout chat failed.";
    return Response.json({ error: "workout_chat_failed", message }, { status: 500 });
  }
}
