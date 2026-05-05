import type { CompactExercise } from "@/lib/exercises/search";
import type { WorkoutIntake } from "@/lib/ai/workout-types";

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
      content: `You extract workout intake for Oracle Conditioning. Return JSON only.

Fields:
- goal: the trainee's main outcome for today's workout.
- equipment: available kit as short lowercase strings. Use ["bodyweight"] if no equipment.
- timeMinutes: integer duration in minutes.
- level: beginner, intermediate, advanced, or unknown.
- injuriesOrConstraints: relevant injuries, pain, limitations, contraindications, or "none" if explicitly none.
- boxingFocus: boxing demand to support, for example footwork, punching power, gas tank, core rotation, shoulder durability, general boxing.

Rules:
- Merge new information with existing intake.
- Do not invent missing values.
- Keep arrays compact.
- If the user says no injuries, store "none".
- If time is written as "half an hour", return 30.`,
    },
    {
      role: "user" as const,
      content: JSON.stringify({ existingIntake, transcript }),
    },
  ];
}

export function workoutGenerationPrompt(intake: WorkoutIntake, candidates: CompactExercise[]) {
  const compactCandidates = candidates.map((exercise) => ({
    id: exercise.id,
    title: exercise.title,
    equipment: exercise.equipment,
    category: exercise.category,
    muscles: exercise.muscles,
    difficulty: exercise.difficulty,
    summary: exercise.instructionsSummary,
  }));

  return [
    {
      role: "system" as const,
      content: `You are Oracle Performance Lab, building practical strength and conditioning for boxers.

Create one individual S&C workout for today. Never create a weekly plan.

Hard rules:
- Use only the exact UUID string from the candidate id field. Do not use exercise titles, names, slugs, or invented IDs.
- Output valid JSON only.
- Respect injuries and constraints. If risk exists, choose safer options and explain briefly.
- Match the available equipment. Bodyweight means no external kit.
- Build for boxing transfer: engine, feet, rotation, trunk stiffness, shoulder durability, legs, hips, neck where relevant.
- Keep it doable in the requested time.
- Do not include medical claims, rehab prescriptions, or maximal lifting.
- Use clear coaching notes that sound like a sharp boxing S&C coach, not generic fitness sludge.

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
      content: JSON.stringify({ intake, candidates: compactCandidates }),
    },
  ];
}
