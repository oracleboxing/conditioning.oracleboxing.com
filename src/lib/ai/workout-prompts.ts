import type { CompactExercise } from "@/lib/exercises/search";
import { WORKOUT_AI_SOUL } from "@/lib/ai/workout-soul";
import type { GeneratedWorkout, WorkoutEditPatch, WorkoutIntake } from "@/lib/ai/workout-types";

export const INTAKE_FIELDS = [
  "goal",
  "equipment",
  "timeMinutes",
  "level",
  "injuriesOrConstraints",
  "boxingFocus",
  "trainingEnvironment",
  "recentTrainingOrFatigue",
  "preferredIntensity",
  "whatToAvoid",
  "sessionBias",
  "targetMuscles",
  "targetMovementPatterns",
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
- trainingEnvironment: where they will train, for example commercial gym, home, hotel room, garage, outdoor space, boxing gym, or "unknown".
- recentTrainingOrFatigue: recent sessions, soreness, fatigue, sleep, recovery state, or "fresh" if explicitly fresh.
- preferredIntensity: how hard it should feel today, for example easy, moderate, hard, brutal but safe, low impact, or technical.
- whatToAvoid: exercises, movements, equipment, impact, or styles the user wants to avoid, or "none" if explicitly none.
- sessionBias: strength, power, conditioning, mobility, mixed, or unknown.
- targetMuscles: the body area/muscles the user explicitly wants to train, as lowercase exercise-db style names, for example abdominals, glutes, quadriceps, hamstrings, calves, shoulders, chest, lats, triceps, biceps, lower back.
- targetMovementPatterns: the movement qualities explicitly requested or strongly implied, for example core, anti-extension, anti-rotation, rotation, hinge, squat, lunge, push, pull, carry, shoulder-health, mobility, elastic-conditioning.

Rules:
- Merge new information with existing intake.
- Do not invent specific missing values.
- Keep arrays compact.
- If the user asks for abs, abbs, abdominals, six-pack, core, trunk, bracing, or obliques, set targetMuscles to ["abdominals"] and targetMovementPatterns to core patterns like ["core", "anti-extension", "anti-rotation", "rotation"] as appropriate.
- If the user says no injuries, store "none".
- If the user says nothing to avoid, store "none".
- If time is written as "half an hour", return 30.
- If the user implies no kit, use ["bodyweight"].
- Do not turn "home" or "hotel" into bodyweight if they also mention dumbbells, bands, kettlebells, or other kit.
- Capture the exact coaching usefulness of the answer, not a long transcript.`,
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
- Keep it to 2-4 short sentences.
- Do not say "game plan".
- Do not mention Supabase, databases, exercise libraries, candidates, validation, or internal tools.
- Do not list the full workout yet.
- Confirm the useful coaching picture in plain language: goal, time, kit/environment, intensity or bias, and any constraints.
- Say what you are about to build, for example warm-up, main strength or power work, conditioning/core, cooldown.
- Do not ask a question here. If a question is needed, the chat route will stop before workout generation.
- Do not say "before I write/build/generate it" unless generation is actually being stopped. In this step, state the plan and continue.`,
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
    force: exercise.force,
    mechanic: exercise.mechanic,
    sourceEquipment: exercise.sourceEquipment,
    movementPatterns: exercise.movementPatterns,
    boxingQualities: exercise.boxingQualities,
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
- Use the full intake context: training environment, recent fatigue, preferred intensity, what to avoid, boxing focus, and whether the session should lean strength, power, conditioning, mobility, or mixed.
- Keep it doable in the requested time.
- Do not include medical claims, rehab prescriptions, or maximal lifting.
- Use clear coaching notes that sound like a sharp boxing S&C coach, not generic fitness sludge.
- Every exercise must come from the uploaded free-exercise-db candidate list and have at least one image. Nothing custom, no boxing drills, no made-up hybrid movements.
- Avoid rejectedExerciseIds unless no safe alternative exists.
- Diversify patterns rather than returning the same obvious exercises every time.
- If the user gives a target body area, retrieval and selection must primarily serve that target. Do not broaden a targeted request into a generic full-body circuit unless the user asks for full body.
- For abs/core/trunk requests, the main work must use exercises whose muscles or movement patterns directly match the target area, such as abdominals, core, anti-extension, anti-rotation, rotation, or obliques.

Structure rules:
- Include a prep/warm-up block unless the whole session is explicitly mobility only.
- Include a main strength or power block when the requested bias or goal calls for it.
- Include conditioning and/or core when useful for boxing transfer, especially gas tank, footwork, rotation, or repeat efforts.
- If the request is primarily core/abs, prefer warmup + core + optional core finisher. Do not force a strength block just because the app is S&C.
- Include a cooldown or mobility finish when the user mentions soreness, fatigue, mobility, recovery, hard intensity, or longer sessions.
- Keep the block count realistic for the requested time. Short sessions can use 3 blocks, longer sessions can use 4-5.
- Warm-ups and cooldowns still must use candidate exercises with image-backed UUIDs. Do not invent stretches or drills.
- Do not ignore what the user wants to avoid.

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
    force: exercise.force,
    mechanic: exercise.mechanic,
    sourceEquipment: exercise.sourceEquipment,
    movementPatterns: exercise.movementPatterns,
    boxingQualities: exercise.boxingQualities,
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
    force: exercise.force,
    mechanic: exercise.mechanic,
    sourceEquipment: exercise.sourceEquipment,
    movementPatterns: exercise.movementPatterns,
    boxingQualities: exercise.boxingQualities,
    summary: exercise.instructionsSummary,
    imageCount: exercise.imageUrls.length,
  }));

  return [
    {
      role: "system" as const,
      content: `${WORKOUT_AI_SOUL}

You are editing an already-saved Oracle Conditioning workout live from chat.

Return a small JSON patch only, not the full workout.

Supported JSON shape:
{
  "summary": string,
  "operations": [
    { "op": "update_workout_meta", "title"?: string, "summary"?: string, "durationMinutes"?: number, "difficulty"?: "beginner" | "intermediate" | "advanced", "equipment"?: string[], "safetyNotes"?: string[], "progressionNote"?: string },
    { "op": "update_block", "blockIndex": number, "type"?: "warmup" | "strength" | "conditioning" | "core" | "mobility" | "cooldown", "title"?: string },
    { "op": "update_item", "blockIndex": number, "itemIndex": number, "sets"?: number | null, "reps"?: string | null, "durationSeconds"?: number | null, "restSeconds"?: number | null, "tempo"?: string | null, "coachingNote"?: string },
    { "op": "replace_exercise", "blockIndex": number, "itemIndex": number, "exerciseId": string, "sets"?: number | null, "reps"?: string | null, "durationSeconds"?: number | null, "restSeconds"?: number | null, "tempo"?: string | null, "coachingNote"?: string },
    { "op": "remove_item", "blockIndex": number, "itemIndex": number },
    { "op": "add_item", "blockIndex": number, "position"?: number, "item": { "exerciseId": string, "sets": number | null, "reps": string | null, "durationSeconds": number | null, "restSeconds": number | null, "tempo": string | null, "coachingNote": string } }
  ]
}

Rules:
- Patch the smallest number of fields needed for the user's requested change.
- blockIndex and itemIndex are zero-based from the current workout JSON.
- If changing exercises or adding an item, use only exact candidate UUIDs for exercises that have images.
- Keep unchanged parts of the workout stable.
- Do not invent exercises.
- If the request is unclear, return { "summary": "No clear edit requested.", "operations": [] }.`,
    },
    {
      role: "user" as const,
      content: JSON.stringify({ intake, workout, candidates: compactCandidates, instruction }),
    },
  ];
}

export function workoutEditPatchFallback(workout: GeneratedWorkout): WorkoutEditPatch {
  return { summary: `No patch generated for ${workout.title}.`, operations: [] };
}
