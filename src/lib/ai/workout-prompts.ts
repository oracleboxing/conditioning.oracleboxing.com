import type { CompactExercise } from "@/lib/exercises/search";
import { WORKOUT_AI_SOUL } from "@/lib/ai/workout-soul";
import type { GeneratedWorkout, WorkoutIntake } from "@/lib/ai/workout-types";

export const INTAKE_FIELDS = [
  "goal",
  "equipment",
  "timeMinutes",
  "level",
  "injuriesOrConstraints",
  "boxingFocus",
] as const;

export function intakeExtractionPrompt(existingIntake: Partial<WorkoutIntake>, transcript: string) {
  return [
    {
      role: "system" as const,
      content: `${WORKOUT_AI_SOUL}

You extract workout intake for Oracle Conditioning. Return JSON only.

Fields:
- goal: the trainee's main outcome for today's workout.
- equipment: available kit as short lowercase strings. Use ["bodyweight"] if no equipment.
- timeMinutes: integer duration in minutes.
- level: beginner, intermediate, advanced, or unknown.
- injuriesOrConstraints: relevant injuries, pain, limitations, contraindications, or "none" if explicitly none.
- boxingFocus: boxing demand to support, for example footwork, punching power, gas tank, core rotation, shoulder durability, general boxing.

Rules:
- Merge new information with existing intake.
- Do not invent specific missing values.
- Keep arrays compact.
- If the user says no injuries, store "none".
- If time is written as "half an hour", return 30.
- If the user implies no kit, home workout, hotel room, or no gym, use ["bodyweight"].`,
    },
    {
      role: "user" as const,
      content: JSON.stringify({ existingIntake, transcript }),
    },
  ];
}

export function workoutAssumptionsPrompt(intake: WorkoutIntake, candidates: CompactExercise[]) {
  const candidateSample = candidates.slice(0, 18).map((exercise) => ({
    title: exercise.title,
    equipment: exercise.equipment,
    category: exercise.category,
    muscles: exercise.muscles,
    difficulty: exercise.difficulty,
  }));

  return [
    {
      role: "system" as const,
      content: `${WORKOUT_AI_SOUL}

You are speaking before building a workout draft.

Rules:
- Keep it to 1-3 short sentences.
- Do not say "game plan".
- Do not mention Supabase, databases, exercise libraries, candidates, validation, or internal tools.
- Do not list the full workout yet.
- If equipment was clearly provided, briefly confirm the useful constraints and say you are building the draft.
- If equipment is vague, ask what equipment they have instead of assuming.`,
    },
    {
      role: "user" as const,
      content: JSON.stringify({ intake, candidateSample }),
    },
  ];
}

export function workoutGenerationPrompt(intake: WorkoutIntake, candidates: CompactExercise[], rejectedExerciseIds: string[] = []) {
  const compactCandidates = candidates.map((exercise) => ({
    id: exercise.id,
    title: exercise.title,
    equipment: exercise.equipment,
    category: exercise.category,
    muscles: exercise.muscles,
    difficulty: exercise.difficulty,
    summary: exercise.instructionsSummary,
    imageCount: exercise.imageUrls.length,
  }));

  return [
    {
      role: "system" as const,
      content: `${WORKOUT_AI_SOUL}

You are building practical strength and conditioning for boxers.

Create one individual S&C workout for today. Never create a weekly plan.

Hard rules:
- Use only the exact UUID string from the candidate id field. Do not use exercise titles, names, slugs, or invented IDs.
- Do not rename exercises. Exercise names displayed to the user must be database titles only, attached by the UI from the UUID.
- Output valid JSON only.
- Respect injuries and constraints. If risk exists, choose safer options and explain briefly.
- Match the available equipment. Bodyweight means no external kit.
- Build for boxing transfer: engine, feet, rotation, trunk stiffness, shoulder durability, legs, hips, neck where relevant.
- Keep it doable in the requested time.
- Do not include medical claims, rehab prescriptions, or maximal lifting.
- Use clear coaching notes that sound like a sharp boxing S&C coach, not generic fitness sludge.
- Every exercise must come from the uploaded free-exercise-db candidate list and have at least one image. Nothing custom, no boxing drills, no made-up hybrid movements.
- Avoid rejectedExerciseIds unless no safe alternative exists.
- Diversify patterns rather than returning the same obvious exercises every time.

JSON shape:
{
  "title": string,
  "summary": string,
  "durationMinutes": number,
  "difficulty": "beginner" | "intermediate" | "advanced",
  "equipment": string[],
  "blocks": [
    {
      "type": "warmup" | "strength" | "conditioning" | "core" | "mobility" | "cooldown",
      "title": string,
      "items": [
        {
          "exerciseId": string,
          "sets": number | null,
          "reps": string | null,
          "durationSeconds": number | null,
          "restSeconds": number | null,
          "tempo": string | null,
          "coachingNote": string
        }
      ]
    }
  ],
  "safetyNotes": string[],
  "progressionNote": string
}`,
    },
    {
      role: "user" as const,
      content: JSON.stringify({ intake, candidates: compactCandidates, rejectedExerciseIds }),
    },
  ];
}

export function workoutSwapPrompt(intake: WorkoutIntake, workout: GeneratedWorkout, candidates: CompactExercise[], rejectedExerciseIds: string[], instruction: string) {
  const compactCandidates = candidates.map((exercise) => ({
    id: exercise.id,
    title: exercise.title,
    equipment: exercise.equipment,
    category: exercise.category,
    muscles: exercise.muscles,
    difficulty: exercise.difficulty,
    summary: exercise.instructionsSummary,
    imageCount: exercise.imageUrls.length,
  }));

  return [
    {
      role: "system" as const,
      content: `${WORKOUT_AI_SOUL}

You adjust a draft Oracle boxing S&C workout after user review.

Return the full updated workout JSON only.

Hard rules:
- Use only exact candidate UUIDs for exercises that have images.
- Exercise names displayed to the user must be database titles only, attached by the UI from the UUID.
- Replace rejected exercises with sensible alternatives from candidates.
- Keep the workout coherent, same JSON shape, and do not invent exercises.`,
    },
    {
      role: "user" as const,
      content: JSON.stringify({ intake, workout, candidates: compactCandidates, rejectedExerciseIds, instruction }),
    },
  ];
}


export function workoutEditPrompt(intake: WorkoutIntake, workout: GeneratedWorkout, candidates: CompactExercise[], instruction: string) {
  const compactCandidates = candidates.map((exercise) => ({
    id: exercise.id,
    title: exercise.title,
    equipment: exercise.equipment,
    category: exercise.category,
    muscles: exercise.muscles,
    difficulty: exercise.difficulty,
    summary: exercise.instructionsSummary,
    imageCount: exercise.imageUrls.length,
  }));

  return [
    {
      role: "system" as const,
      content: `${WORKOUT_AI_SOUL}

You are editing an already-saved Oracle Conditioning workout live from chat.

Return the full updated workout JSON only.

Rules:
- Apply the user's requested change directly.
- You can change exercises, sets, reps, times, rests, block titles, notes, duration, or difficulty.
- If changing exercises, use only exact candidate UUIDs for exercises that have images.
- Keep unchanged parts of the workout stable unless they conflict with the user request.
- Do not explain the edit in the JSON.
- Do not invent exercises.`,
    },
    {
      role: "user" as const,
      content: JSON.stringify({ intake, workout, candidates: compactCandidates, instruction }),
    },
  ];
}
