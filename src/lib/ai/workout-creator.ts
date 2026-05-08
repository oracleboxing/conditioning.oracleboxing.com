import { searchExercises, toCompactExercise, type CompactExercise } from "@/lib/exercises/search";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import type { ExerciseRow } from "@/lib/supabase/types";
import { intakeExtractionPrompt, workoutAssumptionsPrompt, workoutEditPatchFallback, workoutEditPrompt, workoutGenerationPrompt, workoutSwapPrompt } from "@/lib/ai/workout-prompts";
import { openAiJson, openAiTextStream, workoutModel } from "@/lib/ai/openai";
import type {
  GeneratedWorkout,
  GeneratedWorkoutBlock,
  GeneratedWorkoutItem,
  WorkoutChatMessage,
  WorkoutEditPatch,
  WorkoutEditPatchOperation,
  WorkoutIntake,
  WorkoutPersistence,
} from "@/lib/ai/workout-types";

const EMPTY_INTAKE: WorkoutIntake = {
  goal: null,
  equipment: [],
  timeMinutes: null,
  level: null,
  injuriesOrConstraints: null,
  boxingFocus: null,
  trainingEnvironment: null,
  recentTrainingOrFatigue: null,
  preferredIntensity: null,
  whatToAvoid: null,
  sessionBias: null,
  targetMuscles: [],
  targetMovementPatterns: [],
};

const WORKOUT_TABLE_MISSING_CODES = new Set(["42P01", "PGRST205", "PGRST202"]);

function cleanString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function cleanEquipment(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim().toLowerCase()).filter(Boolean))];
}

function cleanStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim().toLowerCase()).filter(Boolean))];
}

function cleanTime(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.min(120, Math.max(10, Math.round(parsed)));
}

function cleanLevel(value: unknown): WorkoutIntake["level"] {
  if (value === "beginner" || value === "intermediate" || value === "advanced" || value === "unknown") return value;
  return null;
}

function cleanSessionBias(value: unknown): WorkoutIntake["sessionBias"] {
  if (value === "strength" || value === "power" || value === "conditioning" || value === "mobility" || value === "mixed" || value === "unknown") return value;
  return null;
}

function normalizeIntake(value: Partial<WorkoutIntake> | null | undefined): WorkoutIntake {
  return {
    goal: cleanString(value?.goal),
    equipment: cleanEquipment(value?.equipment),
    timeMinutes: cleanTime(value?.timeMinutes),
    level: cleanLevel(value?.level),
    injuriesOrConstraints: cleanString(value?.injuriesOrConstraints),
    boxingFocus: cleanString(value?.boxingFocus),
    trainingEnvironment: cleanString(value?.trainingEnvironment),
    recentTrainingOrFatigue: cleanString(value?.recentTrainingOrFatigue),
    preferredIntensity: cleanString(value?.preferredIntensity),
    whatToAvoid: cleanString(value?.whatToAvoid),
    sessionBias: cleanSessionBias(value?.sessionBias),
    targetMuscles: cleanStringArray(value?.targetMuscles),
    targetMovementPatterns: cleanStringArray(value?.targetMovementPatterns),
  };
}

function mergeIntake(base: WorkoutIntake, extracted: Partial<WorkoutIntake>) {
  const clean = normalizeIntake(extracted);
  return {
    goal: clean.goal ?? base.goal,
    equipment: clean.equipment.length ? clean.equipment : base.equipment,
    timeMinutes: clean.timeMinutes ?? base.timeMinutes,
    level: clean.level ?? base.level,
    injuriesOrConstraints: clean.injuriesOrConstraints ?? base.injuriesOrConstraints,
    boxingFocus: clean.boxingFocus ?? base.boxingFocus,
    trainingEnvironment: clean.trainingEnvironment ?? base.trainingEnvironment,
    recentTrainingOrFatigue: clean.recentTrainingOrFatigue ?? base.recentTrainingOrFatigue,
    preferredIntensity: clean.preferredIntensity ?? base.preferredIntensity,
    whatToAvoid: clean.whatToAvoid ?? base.whatToAvoid,
    sessionBias: clean.sessionBias ?? base.sessionBias,
    targetMuscles: clean.targetMuscles.length ? clean.targetMuscles : base.targetMuscles,
    targetMovementPatterns: clean.targetMovementPatterns.length ? clean.targetMovementPatterns : base.targetMovementPatterns,
  } satisfies WorkoutIntake;
}

function transcriptFrom(messages: WorkoutChatMessage[]) {
  return messages.map((message) => `${message.role}: ${message.content}`).join("\n").slice(-5000);
}

function normalizeEquipmentToken(value: string) {
  const item = value.trim().toLowerCase();
  if (/full gym|commercial gym|gym access|all equipment|any equipment|everything/.test(item)) return "full gym";
  if (/resistance bands?|bands?|mini bands?|loop bands?/.test(item)) return "bands";
  if (/dumbbells?|dbs?/.test(item)) return "dumbbell";
  if (/kettlebells?|kbs?/.test(item)) return "kettlebells";
  if (/barbells?/.test(item)) return "barbell";
  if (/body ?weight|none|no equipment/.test(item)) return "bodyweight";
  return item;
}

function heuristicExtract(message: string): Partial<WorkoutIntake> {
  const lower = message.toLowerCase();
  const minutes = lower.match(/(\d{2,3})\s*(min|mins|minutes|m)\b/)?.[1];
  const equipment = ["bodyweight", "dumbbell", "dumbbells", "kettlebell", "kettlebells", "barbell", "band", "bands", "bench", "pull-up bar", "medicine ball"].filter((item) => lower.includes(item));
  if (/resitance band|resistance band|loop band|mini band/.test(lower)) equipment.push("bands");
  if (/full gym|commercial gym|gym access|all equipment|any equipment/.test(lower)) equipment.push("full gym");
  const level = lower.includes("beginner") ? "beginner" : lower.includes("advanced") ? "advanced" : lower.includes("intermediate") ? "intermediate" : undefined;
  const noInjuries = /no (injuries|pain|issues|constraints)/i.test(message);
  const nothingToAvoid = /nothing to avoid|avoid nothing|no (burpees|running|jumping|overhead|preferences|avoid)/i.test(message);
  const trainingEnvironment = lower.includes("hotel") ? "hotel" : lower.includes("home") ? "home" : lower.includes("gym") ? "gym" : undefined;
  const sessionBias = lower.includes("mobility") ? "mobility" : lower.includes("power") || lower.includes("explosive") ? "power" : lower.includes("conditioning") || lower.includes("cardio") || lower.includes("engine") ? "conditioning" : lower.includes("strength") ? "strength" : undefined;
  const preferredIntensity = lower.includes("easy") || lower.includes("light") ? "easy" : lower.includes("hard") || lower.includes("intense") ? "hard" : lower.includes("moderate") ? "moderate" : undefined;
  const coreFocused = /\b(ab+s?|abs|abdominals?|six[ -]?pack|core|trunk|brace|bracing|obliques?)\b/.test(lower);

  return {
    goal: message.length > 8 || coreFocused ? message : undefined,
    equipment: equipment.length ? [...new Set(equipment.map(normalizeEquipmentToken))] : undefined,
    timeMinutes: minutes ? Number(minutes) : undefined,
    level,
    injuriesOrConstraints: noInjuries ? "none" : undefined,
    boxingFocus: coreFocused ? "core" : undefined,
    targetMuscles: coreFocused ? ["abdominals"] : undefined,
    targetMovementPatterns: coreFocused ? ["core", "anti-extension", "anti-rotation", "rotation"] : undefined,
    trainingEnvironment,
    preferredIntensity,
    whatToAvoid: nothingToAvoid ? "none" : undefined,
    sessionBias,
  };
}

function heuristicExtractFromMessages(messages: WorkoutChatMessage[]) {
  return messages
    .filter((message) => message.role === "user")
    .reduce(
      (intake, message) => mergeIntake(intake, heuristicExtract(message.content)),
      EMPTY_INTAKE,
    );
}

export type WorkoutConversationMode = "build_now" | "shape_idea" | "safety_clarify";

type CoachQuestionResult = {
  mode: WorkoutConversationMode;
  questions: string[];
};

function includesAny(value: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(value));
}

function hasVagueInjuryMention(message: string, intake: WorkoutIntake) {
  const lower = message.toLowerCase();
  const constraintText = `${lower} ${intake.injuriesOrConstraints ?? ""} ${intake.whatToAvoid ?? ""}`.toLowerCase();
  const mentionsPain = /\b(injury|injured|pain|niggle|sore|dodgy|bad knee|bad shoulder|back issue|shoulder issue|knee issue)\b/.test(constraintText);
  if (!mentionsPain) return false;
  const detailGiven = /\b(squat|lunge|jump|run|sprint|overhead|press|pull|hinge|impact|rotation|extension|bending|twisting|left|right)\b/.test(constraintText);
  return !detailGiven;
}

function ideaQuestionFor(message: string, intake: WorkoutIntake) {
  const focus = `${message} ${intake.goal ?? ""} ${intake.boxingFocus ?? ""} ${intake.sessionBias ?? ""}`.toLowerCase();

  if (includesAny(focus, [/pressure|tyson|inside fighter|come forward|front foot/])) {
    return "For that style, should this bias legs and pressure, trunk rotation, or repeated high-output bursts?";
  }

  if (includesAny(focus, [/explosive|power|snap|punch harder|punching power|first step/])) {
    return "Are we chasing punch snap, rotation through the hips and trunk, or first-step explosiveness?";
  }

  if (includesAny(focus, [/gas|gassing|engine|stamina|cardio|conditioning|fitter|fitness|tired|fatigue/])) {
    return "Boxing fitness can mean a few things. Do you want repeat-burst conditioning, footwork engine, or a general full-body gas tank?";
  }

  if (includesAny(focus, [/weight loss|lose weight|fat loss|sweat|burn/])) {
    return "Do you want this to feel like sweaty conditioning, strength work that burns, or a mix?";
  }

  if (includesAny(focus, [/mobility|loosen|recover|recovery|stretch|stiff/])) {
    return "Are we trying to loosen the hips, shoulders, trunk, or just bring your whole body down a gear?";
  }

  if (includesAny(focus, [/core|abs|trunk|rotation|brace|oblique/])) {
    return "Should this be more about trunk stiffness for taking shots, rotation for punching, or straight-up abs work?";
  }

  return "What are we trying to turn you into today: stronger, sharper, fitter, more explosive, or harder to break down?";
}

export function nextCoachQuestion(intake: WorkoutIntake, latestMessage = ""): CoachQuestionResult {
  const missingLogistics: string[] = [];
  const hasGoal = Boolean(intake.goal);
  const hasTime = Boolean(intake.timeMinutes);
  const hasEquipment = intake.equipment.length > 0;
  const hasSafety = Boolean(intake.injuriesOrConstraints) || Boolean(intake.whatToAvoid);

  if (!hasTime) missingLogistics.push("time");
  if (!hasEquipment) missingLogistics.push("kit");

  if (hasVagueInjuryMention(latestMessage, intake)) {
    return {
      mode: "safety_clarify",
      questions: ["Quick check before I build it: what actually irritates it, squats/lunges, jumping/running, overhead work, rotation, or all of the above?"],
    };
  }

  if (hasGoal && hasTime && hasEquipment) {
    return { mode: "build_now", questions: [] };
  }

  const lower = latestMessage.toLowerCase();
  const asksToBuild = /\b(build|create|make|generate|write|give me|do)\b/.test(lower);
  const vibeLed = hasGoal || includesAny(lower, [/fitter|fitness|explosive|power|pressure|tyson|style|gas|engine|stamina|footwork|stronger|mobility|conditioning|sparring|boxing/]);

  if (vibeLed && !asksToBuild) {
    const logistics = missingLogistics.length ? `Also give me ${missingLogistics.join(" + ")}.` : null;
    const safety = !hasSafety ? "If anything’s sore or off-limits, say that too." : null;
    return {
      mode: "shape_idea",
      questions: [ideaQuestionFor(latestMessage, intake), [logistics, safety].filter(Boolean).join(" ")].filter(Boolean),
    };
  }

  if (!hasGoal) {
    return {
      mode: "shape_idea",
      questions: ["What are we training today? Give me the boxing problem or body area, plus time and kit."],
    };
  }

  if (missingLogistics.length) {
    return {
      mode: "shape_idea",
      questions: [
        `${ideaQuestionFor(latestMessage, intake)}\n\nAlso give me ${missingLogistics.join(" + ")}.${!hasSafety ? " If anything’s sore, say that too." : ""}`,
      ],
    };
  }

  return { mode: "build_now", questions: [] };
}

export function missingIntakeQuestions(intake: WorkoutIntake) {
  return nextCoachQuestion(intake).questions;
}

export function applyWorkoutAssumptions(intake: WorkoutIntake): WorkoutIntake {
  return {
    ...intake,
    equipment: intake.equipment.length ? intake.equipment : ["bodyweight"],
    timeMinutes: intake.timeMinutes ?? 30,
    level: intake.level && intake.level !== "unknown" ? intake.level : "intermediate",
    injuriesOrConstraints: intake.injuriesOrConstraints ?? "none stated",
    boxingFocus: intake.boxingFocus ?? "general boxing conditioning",
    trainingEnvironment: intake.trainingEnvironment ?? "not specified",
    recentTrainingOrFatigue: intake.recentTrainingOrFatigue ?? "not specified",
    preferredIntensity: intake.preferredIntensity ?? "moderate to hard",
    whatToAvoid: intake.whatToAvoid ?? "none stated",
    sessionBias: intake.sessionBias && intake.sessionBias !== "unknown" ? intake.sessionBias : "mixed",
    targetMuscles: intake.targetMuscles,
    targetMovementPatterns: intake.targetMovementPatterns,
  };
}

export async function extractIntake(messages: WorkoutChatMessage[], existingIntake?: Partial<WorkoutIntake>) {
  const current = normalizeIntake(existingIntake ?? EMPTY_INTAKE);
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
  const fallback = mergeIntake(heuristicExtractFromMessages(messages), heuristicExtract(latestUserMessage));
  const extracted = await openAiJson<Partial<WorkoutIntake>>(intakeExtractionPrompt(current, transcriptFrom(messages)), fallback);
  return mergeIntake(mergeIntake(current, fallback), extracted);
}


type TargetProfile = {
  muscles: string[];
  movementPatterns: string[];
  boxingQualities: string[];
  targeted: boolean;
  strict: boolean;
};

function targetProfileFor(intake: WorkoutIntake): TargetProfile {
  const focus = `${intake.goal ?? ""} ${intake.boxingFocus ?? ""} ${intake.sessionBias ?? ""}`.toLowerCase();
  const muscles = new Set(intake.targetMuscles);
  const movementPatterns = new Set(intake.targetMovementPatterns);
  const boxingQualities = new Set<string>();

  const add = (nextMuscles: string[], nextPatterns: string[] = [], nextQualities: string[] = []) => {
    nextMuscles.forEach((item) => muscles.add(item));
    nextPatterns.forEach((item) => movementPatterns.add(item));
    nextQualities.forEach((item) => boxingQualities.add(item));
  };

  if (/\b(ab+s?|abs|abdominals?|six[ -]?pack|core|trunk|brace|bracing|obliques?)\b/.test(focus)) add(["abdominals"], ["core", "anti-extension", "anti-rotation", "rotation"], ["trunk", "punch-transfer"]);
  if (/\b(glutes?|hips?)\b/.test(focus)) add(["glutes"], ["hinge", "lunge", "single-leg"], ["legs", "punch-transfer"]);
  if (/\b(legs?|quads?|hamstrings?|calves|footwork|feet)\b/.test(focus)) add(["quadriceps", "hamstrings", "calves", "glutes"], ["squat", "lunge", "single-leg", "elastic-conditioning"], ["legs", "footwork-base"]);
  if (/\b(shoulders?|rotator|scap|overhead)\b/.test(focus)) add(["shoulders", "traps"], ["shoulder-health", "push", "pull"], ["shoulder-durability"]);
  if (/\b(chest|pecs?)\b/.test(focus)) add(["chest"], ["push"], ["general-athleticism"]);
  if (/\b(back|lats?|rows?|pull)\b/.test(focus)) add(["lats", "middle back", "lower back"], ["pull", "hinge"], ["shoulder-durability"]);
  if (/\b(arms?|biceps?)\b/.test(focus)) add(["biceps", "triceps"], ["push", "pull"], ["general-athleticism"]);
  if (/\btriceps?\b/.test(focus)) add(["triceps"], ["push", "shoulder-health"], ["shoulder-durability", "repeat-efforts", "punch-transfer"]);

  return {
    muscles: [...muscles],
    movementPatterns: [...movementPatterns],
    boxingQualities: [...boxingQualities],
    targeted: muscles.size > 0 || movementPatterns.size > 0,
    strict: muscles.size > 0,
  };
}

function exerciseMatchesTarget(exercise: CompactExercise, target: TargetProfile) {
  if (!target.strict) return true;
  const wantedMuscles = normalizedSet(target.muscles);
  const wantedPatterns = normalizedSet(target.movementPatterns);
  const primaryMatch = exercise.muscles.primary.some((muscle) => wantedMuscles.has(muscle.trim().toLowerCase()));
  const patternMatch = exercise.movementPatterns.some((pattern) => wantedPatterns.has(pattern.trim().toLowerCase()));
  return primaryMatch || patternMatch;
}

function searchConfigFor(intake: WorkoutIntake) {
  const focus = `${intake.goal ?? ""} ${intake.boxingFocus ?? ""}`.toLowerCase();
  const target = targetProfileFor(intake);
  const config = {
    boxingQualities: [...target.boxingQualities] as string[],
    movementPatterns: [...target.movementPatterns] as string[],
    muscles: [...target.muscles] as string[],
  };

  if (/gas|engine|conditioning|stamina|fitness|cardio|tired|fatigue/.test(focus)) {
    config.boxingQualities.push("gas-tank", "repeat-efforts");
    config.movementPatterns.push("elastic-conditioning", "core");
  }
  if (/pressure|tyson|inside fighter|come forward|front foot|walk down/.test(focus)) {
    config.boxingQualities.push("legs", "trunk", "repeat-efforts", "punch-transfer");
    config.movementPatterns.push("squat", "lunge", "single-leg", "anti-rotation", "rotation", "elastic-conditioning");
    config.muscles.push("quadriceps", "glutes", "hamstrings", "abdominals");
  }
  if (/power|punch|explosive|snap|rotation/.test(focus)) {
    config.boxingQualities.push("power", "punch-transfer", "trunk");
    config.movementPatterns.push("rotation", "anti-rotation", "hinge", "squat");
    config.muscles.push("abdominals", "glutes", "quadriceps");
  }
  if (/footwork|feet|legs|bounce|movement/.test(focus)) {
    config.boxingQualities.push("footwork-base", "legs", "repeat-efforts");
    config.movementPatterns.push("single-leg", "lunge", "squat", "elastic-conditioning");
    config.muscles.push("calves", "quadriceps", "glutes");
  }
  if (/shoulder|rotator|arm|durability|prehab/.test(focus)) {
    config.boxingQualities.push("shoulder-durability");
    config.movementPatterns.push("shoulder-health", "pull", "push");
    config.muscles.push("shoulders", "traps", "lats");
  }
  if (/triceps?/.test(focus)) {
    config.boxingQualities.push("shoulder-durability", "repeat-efforts", "punch-transfer");
    config.movementPatterns.push("push", "shoulder-health");
    config.muscles.push("triceps");
  }
  if (/\b(ab+s?|abs|abdominals?|six[ -]?pack|core|trunk|brace|bracing|obliques?)\b/.test(focus)) {
    config.boxingQualities.push("trunk", "punch-transfer");
    config.movementPatterns.push("anti-extension", "anti-rotation", "rotation", "core");
    config.muscles.push("abdominals");
  }
  if (/mobility|stretch|recover|recovery|loosen/.test(focus)) {
    config.boxingQualities.push("mobility-recovery");
    config.movementPatterns.push("mobility");
  }

  if (!config.boxingQualities.length) config.boxingQualities.push("general-athleticism");
  return {
    boxingQualities: [...new Set(config.boxingQualities)],
    movementPatterns: [...new Set(config.movementPatterns)],
    muscles: [...new Set(config.muscles)],
  };
}

function searchTermsFor(intake: WorkoutIntake) {
  const focus = `${intake.goal ?? ""} ${intake.boxingFocus ?? ""}`.toLowerCase();
  const target = targetProfileFor(intake);
  const terms = target.targeted ? [...target.muscles, ...target.movementPatterns] : ["squat", "lunge", "push", "row", "plank", "bridge", "rotation", "jump", "stretch"];

  if (focus.includes("glute") || focus.includes("hip")) terms.push("glute", "hip", "bridge", "lunge", "squat", "thrust");
  if (focus.includes("shoulder")) terms.push("shoulder", "external rotation", "press");
  if (/triceps?/.test(focus)) terms.push("triceps", "skull crusher", "extension", "pushdown", "pressdown");
  if (focus.includes("footwork") || focus.includes("legs")) terms.push("calf", "step", "jump");
  if (focus.includes("power") || focus.includes("punch")) terms.push("medicine ball", "rotation", "press", "jump", "squat");
  if (focus.includes("engine") || focus.includes("gas") || focus.includes("conditioning")) terms.push("burpee", "mountain climber", "jumping jack");
  if (/pressure|tyson|inside fighter|come forward|front foot|walk down/.test(focus)) terms.push("squat", "lunge", "split squat", "rotation", "pallof", "mountain climber");
  if (/\b(ab+s?|abs|abdominals?|six[ -]?pack|core|trunk|brace|bracing|obliques?|rotation)\b/.test(focus)) terms.push("plank", "crunch", "leg raise", "knee raise", "dead bug", "hollow", "twist", "woodchop", "pallof", "ab");

  const avoidTerms = avoidTermsFor(intake);
  return [...new Set(terms)].filter((term) => !termMatchesAvoids(term, avoidTerms));
}

function equipmentParam(intake: WorkoutIntake) {
  const equipment = [...new Set(intake.equipment.map(normalizeEquipmentToken).filter(Boolean))];
  if (!equipment.length) return undefined;
  if (equipment.some((item) => item === "full gym")) return undefined;
  if (equipment.includes("bodyweight")) return "bodyweight";
  return equipment.join(",") || undefined;
}

function stableHash(source: string) {
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }
  return hash;
}

type CandidateDebug = {
  searchedFor: ReturnType<typeof searchConfigFor> & { terms: string[]; equipment?: string; difficulty?: string };
  gathered: number;
  returned: number;
  topScores: Array<{ id: string; title: string; score: number; reasons: string[] }>;
};

export type ExerciseCandidatePack = CompactExercise[] & { debug?: CandidateDebug };

function normalizedSet(values: string[]) {
  return new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean));
}

function intersects(values: string[], wanted: Set<string>) {
  return values.some((value) => wanted.has(value.trim().toLowerCase()));
}

function avoidTermsFor(intake: WorkoutIntake) {
  const explicitAvoid = (intake.whatToAvoid ?? "").toLowerCase();
  const constraints = (intake.injuriesOrConstraints ?? "").toLowerCase();
  const avoidText = `${explicitAvoid} ${constraints}`.trim();
  const explicitNone = !explicitAvoid || /^(none|none stated|nothing|nothing to avoid|no preferences)$/i.test(explicitAvoid.trim());
  const hasAvoidSignal = /\b(avoid|except|without|no jumping|no running|no burpees|overhead|jump(?:ing|s)?|burpees?|sprints?)\b/.test(avoidText);
  if (!avoidText || (explicitNone && !hasAvoidSignal)) return [];

  const terms = new Set<string>();
  const add = (...items: string[]) => items.forEach((item) => terms.add(item));
  const focus = `${intake.goal ?? ""} ${intake.boxingFocus ?? ""}`.toLowerCase();

  if (/\bburpees?\b/.test(avoidText)) add("burpee");
  if (/\bjump(?:ing|s)?\b|\bplyo(?:metric)?s?\b|\bbounds?\b|\bhops?\b/.test(avoidText)) add("jump", "jumping", "bound", "hop", "plyo");
  if (/\brunn?ing\b|\bsprints?\b/.test(avoidText)) add("run", "running", "sprint");
  if (/\boverhead\b/.test(avoidText)) add("overhead", "shoulder press", "military press");
  if (/\bpress(?:ing)?\b/.test(avoidText) && /\bshoulder|overhead|rotator|impingement\b/.test(avoidText)) add("shoulder press", "military press");
  if (/\bupright rows?\b/.test(avoidText)) add("upright row");
  if (/\bshoulder|rotator|impingement\b/.test(`${avoidText} ${focus}`) && (/\boverhead|press|pain|impingement\b/.test(avoidText) || /\brotator\b/.test(focus))) add("upright row", "dip");

  return [...terms];
}

function termMatchesAvoids(term: string, avoidTerms: string[]) {
  const normalized = term.toLowerCase();
  return avoidTerms.some((avoid) => normalized.includes(avoid) || avoid.includes(normalized));
}

function exerciseMatchesAvoids(exercise: CompactExercise, avoidTerms: string[]) {
  if (!avoidTerms.length) return false;
  const haystack = [
    exercise.title,
    exercise.slug,
    exercise.category ?? "",
    exercise.instructionsSummary ?? "",
    exercise.sourceEquipment ?? "",
    ...exercise.movementPatterns,
    ...exercise.boxingQualities,
    ...exercise.boxingSnc.roles,
    ...exercise.boxingSnc.movementFamilies,
    ...exercise.boxingSnc.adaptations,
  ].join(" ").toLowerCase();

  return avoidTerms.some((term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped.replace(/\\ /g, "\\s+")}\\b`, "i").test(haystack);
  });
}

function scoreExerciseCandidate(exercise: CompactExercise, intake: WorkoutIntake, config: ReturnType<typeof searchConfigFor>, terms: string[], equipment?: string, difficulty?: string) {
  let score = 0;
  const reasons: string[] = [];
  const target = targetProfileFor(intake);
  const wantedQualities = normalizedSet(config.boxingQualities);
  const wantedPatterns = normalizedSet(config.movementPatterns);
  const wantedMuscles = normalizedSet(config.muscles);
  const title = exercise.title.toLowerCase();
  const summary = (exercise.instructionsSummary ?? "").toLowerCase();
  const haystack = `${title} ${summary} ${exercise.category ?? ""} ${exercise.sourceEquipment ?? ""}`.toLowerCase();

  if (exercise.imageUrls.length) {
    score += 20;
    reasons.push("has-image");
  }
  const adaptationMatches = exercise.boxingSnc.adaptations.filter((adaptation) => wantedQualities.has(adaptation));
  const familyMatches = exercise.boxingSnc.movementFamilies.filter((family) => wantedPatterns.has(family));
  if (adaptationMatches.length) {
    score += 24 * adaptationMatches.length;
    reasons.push(`snc-adaptation:${adaptationMatches.join("/")}`);
  } else if (intersects(exercise.boxingQualities, wantedQualities)) {
    const matches = exercise.boxingQualities.filter((quality) => wantedQualities.has(quality));
    score += 10 * matches.length;
    reasons.push(`legacy-quality:${matches.join("/")}`);
  }
  if (familyMatches.length) {
    score += 20 * familyMatches.length;
    reasons.push(`snc-family:${familyMatches.join("/")}`);
  } else if (intersects(exercise.movementPatterns, wantedPatterns)) {
    const matches = exercise.movementPatterns.filter((pattern) => wantedPatterns.has(pattern));
    score += 10 * matches.length;
    reasons.push(`legacy-pattern:${matches.join("/")}`);
  }
  const muscles = [...exercise.muscles.primary, ...exercise.muscles.secondary];
  if (intersects(muscles, wantedMuscles)) {
    score += 10;
    reasons.push("muscle-match");
  }

  if (target.targeted) {
    const targetMuscles = normalizedSet(target.muscles);
    const targetPatterns = normalizedSet(target.movementPatterns);
    const primaryMatches = exercise.muscles.primary.filter((muscle) => targetMuscles.has(muscle.trim().toLowerCase()));
    const secondaryMatches = exercise.muscles.secondary.filter((muscle) => targetMuscles.has(muscle.trim().toLowerCase()));
    const bodyRegionMatches = exercise.boxingSnc.bodyRegions.filter((region) => targetMuscles.has(region.trim().toLowerCase()));
    const patternMatches = [...exercise.movementPatterns, ...exercise.boxingSnc.movementFamilies].filter((pattern) => targetPatterns.has(pattern.trim().toLowerCase()));
    if (primaryMatches.length) {
      score += 36 * primaryMatches.length;
      reasons.push(`target-primary:${primaryMatches.join("/")}`);
    }
    if (secondaryMatches.length) {
      score += 14 * secondaryMatches.length;
      reasons.push(`target-secondary:${secondaryMatches.join("/")}`);
    }
    if (bodyRegionMatches.length) {
      score += 28 * bodyRegionMatches.length;
      reasons.push(`target-region:${bodyRegionMatches.join("/")}`);
    }
    if (patternMatches.length) {
      score += 24 * patternMatches.length;
      reasons.push(`target-pattern:${patternMatches.join("/")}`);
    }
    if (!primaryMatches.length && !secondaryMatches.length && !bodyRegionMatches.length && !patternMatches.length) {
      score -= 42;
      reasons.push("misses-target");
    }
  }
  if (equipment) {
    const wantedEquipment = normalizedSet(equipment.split(","));
    const exerciseEquipment = [...exercise.equipment, exercise.sourceEquipment ?? ""];
    if (intersects(exerciseEquipment, wantedEquipment)) {
      score += 16;
      reasons.push("equipment-match");
    } else if (wantedEquipment.has("bodyweight") && exerciseEquipment.some((item) => /body only|bodyweight/i.test(item))) {
      score += 16;
      reasons.push("equipment-match");
    } else {
      score -= 18;
      reasons.push("equipment-mismatch");
    }
  }
  if (difficulty && exercise.difficulty === difficulty) {
    score += 8;
    reasons.push("level-match");
  }
  for (const term of terms) {
    const cleanTerm = term.toLowerCase();
    if (title.includes(cleanTerm)) {
      score += 7;
      reasons.push(`title:${term}`);
    } else if (haystack.includes(cleanTerm)) {
      score += 3;
    }
  }
  if (intake.injuriesOrConstraints && /shoulder|rotator|impingement/i.test(intake.injuriesOrConstraints) && /press|dip|upright row/i.test(title)) {
    score -= 35;
    reasons.push("shoulder-risk");
  }
  const sncScores = exercise.boxingSnc.scores;
  if (sncScores.boxing_transfer) {
    score += Math.round(sncScores.boxing_transfer / 10);
    reasons.push(`snc-transfer:${sncScores.boxing_transfer}`);
  }
  if (sncScores.fatigue_cost && /easy|light|low-impact|controlled/i.test(intake.preferredIntensity ?? "")) {
    score -= Math.round(sncScores.fatigue_cost / 8);
    reasons.push(`fatigue-cost:${sncScores.fatigue_cost}`);
  }
  if (sncScores.injury_risk && sncScores.injury_risk > 70) {
    score -= 8;
    reasons.push(`risk:${sncScores.injury_risk}`);
  }
  if (sncScores.setup_cost && intake.timeMinutes && intake.timeMinutes <= 20) {
    score -= Math.round(sncScores.setup_cost / 12);
    reasons.push(`setup-cost:${sncScores.setup_cost}`);
  }
  if (/stretch|mobility/.test(title) && !wantedQualities.has("mobility-recovery")) score -= 6;

  return { exercise, score, reasons };
}

function selectNovelCandidates(scored: Array<ReturnType<typeof scoreExerciseCandidate>>, limit: number, seed: string) {
  const selected: CompactExercise[] = [];
  const seenPatterns = new Map<string, number>();
  const seenMuscles = new Map<string, number>();

  const ranked = scored
    .map((item) => ({ ...item, tieBreaker: stableHash(`${seed}:${item.exercise.id}`) / 0xffffffff }))
    .sort((a, b) => b.score - a.score || a.tieBreaker - b.tieBreaker);

  while (selected.length < limit && ranked.length) {
    let bestIndex = 0;
    let bestAdjusted = -Infinity;
    for (let index = 0; index < ranked.length; index += 1) {
      const item = ranked[index];
      const patternPenalty = item.exercise.movementPatterns.reduce((sum, pattern) => sum + (seenPatterns.get(pattern) ?? 0) * 5, 0);
      const musclePenalty = item.exercise.muscles.primary.reduce((sum, muscle) => sum + (seenMuscles.get(muscle) ?? 0) * 3, 0);
      const adjusted = item.score - patternPenalty - musclePenalty - item.tieBreaker;
      if (adjusted > bestAdjusted) {
        bestAdjusted = adjusted;
        bestIndex = index;
      }
    }

    const [picked] = ranked.splice(bestIndex, 1);
    selected.push(picked.exercise);
    picked.exercise.movementPatterns.forEach((pattern) => seenPatterns.set(pattern, (seenPatterns.get(pattern) ?? 0) + 1));
    picked.exercise.muscles.primary.forEach((muscle) => seenMuscles.set(muscle, (seenMuscles.get(muscle) ?? 0) + 1));
  }

  return selected;
}

export async function gatherExerciseCandidates(intake: WorkoutIntake, rejectedExerciseIds: string[] = []): Promise<ExerciseCandidatePack> {
  const equipment = equipmentParam(intake);
  // "Intermediate" is the default assumption for programming, not a hard retrieval constraint.
  // The free-exercise-db difficulty labels are sparse/inconsistent, so filtering by assumed intermediate
  // can wipe out valid equipment pools like resistance bands.
  const levels = intake.level && intake.level !== "unknown" && intake.level !== "intermediate" ? intake.level : undefined;
  const candidateMap = new Map<string, CompactExercise>();
  const add = (exercises: CompactExercise[]) => exercises.forEach((exercise) => candidateMap.set(exercise.id, exercise));

  const config = searchConfigFor(intake);
  const terms = searchTermsFor(intake);
  const avoidTerms = avoidTermsFor(intake);

  if (equipment) add((await searchExercises({ equipment, difficulty: levels, limit: 80 })).data);

  await Promise.all([
    ...config.boxingQualities.slice(0, 4).map((boxingQuality) => searchExercises({ boxingQuality, equipment, difficulty: levels, limit: 24 }).then((result) => add(result.data))),
    ...config.movementPatterns.slice(0, 5).map((movementPattern) => searchExercises({ movementPattern, equipment, difficulty: levels, limit: 20 }).then((result) => add(result.data))),
    ...config.muscles.slice(0, 5).map((muscle) => searchExercises({ muscle, equipment, difficulty: levels, limit: 18 }).then((result) => add(result.data))),
    ...terms.slice(0, 8).map((q) => searchExercises({ q, equipment, difficulty: levels, limit: 14 }).then((result) => add(result.data))),
  ]);

  // If the user gave specific equipment, do not widen to the whole library.
  // "Only bands" must stay bands, not become dumbbells because the candidate pool was small.
  if (candidateMap.size < 30 && !equipment) add((await searchExercises({ difficulty: levels, limit: 60 })).data);

  const rejected = new Set(rejectedExerciseIds);
  const seed = `${intake.goal ?? ""}|${intake.boxingFocus ?? ""}|${intake.targetMuscles.join(",")}|${intake.targetMovementPatterns.join(",")}|${intake.equipment.join(",")}|${new Date().toISOString().slice(0, 10)}`;
  const target = targetProfileFor(intake);
  const scored = [...candidateMap.values()]
    .filter((exercise) => !rejected.has(exercise.id) && exercise.imageUrls.length > 0)
    .filter((exercise) => !exerciseMatchesAvoids(exercise, avoidTerms))
    .filter((exercise) => exerciseMatchesTarget(exercise, target))
    .map((exercise) => scoreExerciseCandidate(exercise, intake, config, terms, equipment, levels))
    .filter((item) => item.score > 0);

  if (!scored.length && target.strict) {
    const relaxedTarget = { ...target, strict: false };
    scored.push(
      ...[...candidateMap.values()]
        .filter((exercise) => !rejected.has(exercise.id) && exercise.imageUrls.length > 0)
        .filter((exercise) => !exerciseMatchesAvoids(exercise, avoidTerms))
        .filter((exercise) => exerciseMatchesTarget(exercise, relaxedTarget))
        .map((exercise) => scoreExerciseCandidate(exercise, intake, config, terms, equipment, levels))
        .filter((item) => item.score > 0),
    );
  }

  const selected = selectNovelCandidates(scored, 80, seed) as ExerciseCandidatePack;
  selected.debug = {
    searchedFor: { ...config, terms, equipment, difficulty: levels },
    gathered: candidateMap.size,
    returned: selected.length,
    topScores: scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map(({ exercise, score, reasons }) => ({ id: exercise.id, title: exercise.title, score, reasons })),
  };

  return selected;
}

export async function streamWorkoutAssumptions(intake: WorkoutIntake, candidates: CompactExercise[]) {
  const fallback = `Got it. I’ll build a ${intake.timeMinutes ?? 30}-minute ${intake.sessionBias ?? "mixed"} session around ${intake.goal ?? "boxing conditioning"}, using ${intake.equipment.join(", ") || "the kit you listed"}. I’ll keep it boxing-relevant with prep, main work, conditioning or core, and a sensible finish.`;
  return openAiTextStream(workoutAssumptionsPrompt(intake, candidates), fallback);
}

function cleanWorkout(value: GeneratedWorkout, intake: WorkoutIntake): GeneratedWorkout {
  return {
    title: cleanString(value.title) ?? "Oracle Conditioning Workout",
    summary: cleanString(value.summary) ?? "A boxing-focused strength and conditioning session.",
    durationMinutes: cleanTime(value.durationMinutes) ?? intake.timeMinutes ?? 30,
    difficulty: value.difficulty === "advanced" || value.difficulty === "intermediate" || value.difficulty === "beginner" ? value.difficulty : "intermediate",
    equipment: cleanEquipment(value.equipment).length ? cleanEquipment(value.equipment) : intake.equipment,
    blocks: Array.isArray(value.blocks) ? value.blocks : [],
    safetyNotes: Array.isArray(value.safetyNotes) ? value.safetyNotes.filter((note): note is string => typeof note === "string") : [],
    progressionNote: cleanString(value.progressionNote) ?? "Repeat once, then progress by adding a little quality volume or reducing rest.",
  };
}

export async function generateWorkout(intake: WorkoutIntake, candidates: CompactExercise[], rejectedExerciseIds: string[] = []) {
  if (!candidates.length) {
    throw new Error("No matching exercises were found for this intake.");
  }

  const target = targetProfileFor(intake);
  const targetedCandidates = target.targeted ? candidates.filter((exercise) => exerciseMatchesTarget(exercise, target)) : candidates;
  const targetLabel = target.muscles.length ? target.muscles.join("/") : target.movementPatterns.join("/");
  const fallback: GeneratedWorkout = target.targeted
    ? {
        title: "Targeted Conditioning Preview",
        summary: `A targeted session built around ${targetLabel || "the requested training focus"}.`,
        durationMinutes: intake.timeMinutes ?? 30,
        difficulty: intake.level === "beginner" || intake.level === "advanced" ? intake.level : "intermediate",
        equipment: intake.equipment,
        blocks: ([
          {
            type: "warmup",
            title: "Targeted prep",
            items: targetedCandidates.slice(0, 2).map((exercise) => ({
              exerciseId: exercise.id,
              sets: 2,
              reps: "8-12 controlled reps",
              durationSeconds: null,
              restSeconds: 20,
              tempo: null,
              coachingNote: "Prep the area you asked to train. Keep it clean and controlled.",
            })),
          },
          {
            type: target.muscles.includes("abdominals") || target.movementPatterns.includes("core") ? "core" : "strength",
            title: "Main targeted work",
            items: targetedCandidates.slice(2, 6).map((exercise) => ({
              exerciseId: exercise.id,
              sets: 3,
              reps: "8-15 or 30-40 seconds",
              durationSeconds: null,
              restSeconds: 45,
              tempo: "controlled",
              coachingNote: "Make the target area do the work. No sloppy reps just to make it harder.",
            })),
          },
          {
            type: target.muscles.includes("abdominals") || target.movementPatterns.includes("core") ? "core" : "conditioning",
            title: "Targeted finisher",
            items: targetedCandidates.slice(6, 8).map((exercise) => ({
              exerciseId: exercise.id,
              sets: 2,
              reps: null,
              durationSeconds: 40,
              restSeconds: 20,
              tempo: null,
              coachingNote: "Finish with quality under fatigue without drifting into a random full-body circuit.",
            })),
          },
        ] satisfies GeneratedWorkoutBlock[]).filter((block) => block.items.length),
        safetyNotes: intake.injuriesOrConstraints && !["none", "none stated"].includes(intake.injuriesOrConstraints.toLowerCase()) ? [`Respect this constraint: ${intake.injuriesOrConstraints}.`] : [],
        progressionNote: "Progress the target area with cleaner volume first, then harder variations.",
      }
    : {
        title: "Oracle Conditioning Preview",
        summary: "A boxing-focused session with prep, main work, and a conditioning finish from available exercises.",
        durationMinutes: intake.timeMinutes ?? 30,
        difficulty: intake.level === "beginner" || intake.level === "advanced" ? intake.level : "intermediate",
        equipment: intake.equipment,
        blocks: ([
          {
            type: "warmup",
            title: "Prep",
            items: candidates.slice(0, 2).map((exercise) => ({
              exerciseId: exercise.id,
              sets: 2,
              reps: "8-10 controlled reps",
              durationSeconds: null,
              restSeconds: 20,
              tempo: null,
              coachingNote: "Open range, find balance, and get warm without wasting energy.",
            })),
          },
          {
            type: "strength",
            title: intake.sessionBias === "power" ? "Main power work" : "Main strength work",
            items: candidates.slice(2, 5).map((exercise) => ({
              exerciseId: exercise.id,
              sets: 3,
              reps: "6-10",
              durationSeconds: null,
              restSeconds: 60,
              tempo: null,
              coachingNote: "Move clean, brace hard, and keep the reps sharp enough to transfer to boxing.",
            })),
          },
          {
            type: "conditioning",
            title: "Boxing engine finish",
            items: candidates.slice(5, 8).map((exercise) => ({
              exerciseId: exercise.id,
              sets: 3,
              reps: null,
              durationSeconds: 40,
              restSeconds: 20,
              tempo: null,
              coachingNote: "Work at a pace you can repeat. No hero round followed by a collapse.",
            })),
          },
        ] satisfies GeneratedWorkoutBlock[]).filter((block) => block.items.length),
        safetyNotes: intake.injuriesOrConstraints && !["none", "none stated"].includes(intake.injuriesOrConstraints.toLowerCase()) ? [`Respect this constraint: ${intake.injuriesOrConstraints}.`] : [],
        progressionNote: "If it feels too easy, add one round before making exercises harder.",
      };

  const generated = await openAiJson<GeneratedWorkout>(workoutGenerationPrompt(intake, candidates, rejectedExerciseIds), fallback);
  return cleanWorkout(generated, intake);
}

function keyForExerciseLookup(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function uuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function swapWorkoutExercise(intake: WorkoutIntake, workout: GeneratedWorkout, candidates: CompactExercise[], rejectedExerciseIds: string[], instruction: string) {
  const fallback: GeneratedWorkout = {
    ...workout,
    blocks: workout.blocks.map((block) => ({
      ...block,
      items: block.items.map((item) => {
        if (!rejectedExerciseIds.includes(item.exerciseId)) return item;
        const replacement = candidates.find((exercise) => !rejectedExerciseIds.includes(exercise.id) && !workout.blocks.some((candidateBlock) => candidateBlock.items.some((candidateItem) => candidateItem.exerciseId === exercise.id)));
        return replacement ? { ...item, exerciseId: replacement.id, exercise: replacement, coachingNote: `Swapped in ${replacement.title}. Keep it crisp and boxing-relevant.` } : item;
      }),
    })),
  };

  const generated = await openAiJson<GeneratedWorkout>(workoutSwapPrompt(intake, workout, candidates, rejectedExerciseIds, instruction), fallback);
  return cleanWorkout(generated, intake);
}


function itemPatchFields(operation: Extract<WorkoutEditPatchOperation, { op: "update_item" | "replace_exercise" }>) {
  return {
    ...(operation.exerciseId ? { exerciseId: operation.exerciseId } : {}),
    ...("sets" in operation ? { sets: operation.sets ?? null } : {}),
    ...("reps" in operation ? { reps: cleanString(operation.reps) } : {}),
    ...("durationSeconds" in operation ? { durationSeconds: operation.durationSeconds ?? null } : {}),
    ...("restSeconds" in operation ? { restSeconds: operation.restSeconds ?? null } : {}),
    ...("tempo" in operation ? { tempo: cleanString(operation.tempo) } : {}),
    ...("coachingNote" in operation ? { coachingNote: cleanString(operation.coachingNote) ?? "Keep it clean and boxing-relevant." } : {}),
  } satisfies Partial<GeneratedWorkoutItem>;
}

function cleanWorkoutEditPatch(value: WorkoutEditPatch | null | undefined): WorkoutEditPatch {
  const operations = Array.isArray(value?.operations) ? value.operations.slice(0, 20) : [];
  return {
    summary: cleanString(value?.summary) ?? undefined,
    operations: operations.filter((operation): operation is WorkoutEditPatchOperation => Boolean(operation && typeof operation === "object" && "op" in operation)),
  };
}

export function applyWorkoutEditPatch(workout: GeneratedWorkout, patch: WorkoutEditPatch, intake: WorkoutIntake) {
  const next: GeneratedWorkout = {
    ...workout,
    equipment: [...workout.equipment],
    safetyNotes: [...workout.safetyNotes],
    blocks: workout.blocks.map((block) => ({ ...block, items: block.items.map((item) => ({ ...item })) })),
  };
  const warnings: string[] = [];

  for (const operation of patch.operations) {
    if (operation.op === "update_workout_meta") {
      next.title = cleanString(operation.title) ?? next.title;
      next.summary = cleanString(operation.summary) ?? next.summary;
      next.durationMinutes = cleanTime(operation.durationMinutes) ?? next.durationMinutes;
      next.difficulty = operation.difficulty === "beginner" || operation.difficulty === "intermediate" || operation.difficulty === "advanced" ? operation.difficulty : next.difficulty;
      next.equipment = cleanEquipment(operation.equipment).length ? cleanEquipment(operation.equipment) : next.equipment;
      next.safetyNotes = Array.isArray(operation.safetyNotes) ? operation.safetyNotes.filter((note): note is string => typeof note === "string") : next.safetyNotes;
      next.progressionNote = cleanString(operation.progressionNote) ?? next.progressionNote;
      continue;
    }

    const block = next.blocks[operation.blockIndex];
    if (!block) {
      warnings.push(`Skipped ${operation.op}: block ${operation.blockIndex} was not found.`);
      continue;
    }

    if (operation.op === "update_block") {
      block.title = cleanString(operation.title) ?? block.title;
      if (["warmup", "strength", "conditioning", "core", "mobility", "cooldown"].includes(operation.type ?? "")) block.type = operation.type as GeneratedWorkout["blocks"][number]["type"];
      continue;
    }

    if (operation.op === "remove_item") {
      if (!block.items[operation.itemIndex]) {
        warnings.push(`Skipped remove_item: item ${operation.itemIndex} was not found.`);
        continue;
      }
      block.items.splice(operation.itemIndex, 1);
      continue;
    }

    if (operation.op === "add_item") {
      if (!operation.item?.exerciseId) {
        warnings.push("Skipped add_item: missing exerciseId.");
        continue;
      }
      const position = Math.max(0, Math.min(block.items.length, Number.isFinite(operation.position) ? operation.position ?? block.items.length : block.items.length));
      block.items.splice(position, 0, {
        exerciseId: operation.item.exerciseId,
        sets: operation.item.sets ?? null,
        reps: cleanString(operation.item.reps),
        durationSeconds: operation.item.durationSeconds ?? null,
        restSeconds: operation.item.restSeconds ?? null,
        tempo: cleanString(operation.item.tempo),
        coachingNote: cleanString(operation.item.coachingNote) ?? "Move clean and keep the quality high.",
      });
      continue;
    }

    const item = block.items[operation.itemIndex];
    if (!item) {
      warnings.push(`Skipped ${operation.op}: item ${operation.itemIndex} was not found.`);
      continue;
    }
    Object.assign(item, itemPatchFields(operation));
  }

  return { workout: cleanWorkout(next, intake), warnings };
}

export async function createWorkoutEditPatch(intake: WorkoutIntake, workout: GeneratedWorkout, candidates: CompactExercise[], instruction: string) {
  const generated = await openAiJson<WorkoutEditPatch>(workoutEditPrompt(intake, workout, candidates, instruction), workoutEditPatchFallback(workout));
  return cleanWorkoutEditPatch(generated);
}

export async function editWorkoutWithInstruction(intake: WorkoutIntake, workout: GeneratedWorkout, candidates: CompactExercise[], instruction: string) {
  const patch = await createWorkoutEditPatch(intake, workout, candidates, instruction);
  const patched = applyWorkoutEditPatch(workout, patch, intake);
  return { ...patched, patch };
}

function diversifyWorkoutItems(blocks: GeneratedWorkoutBlock[], candidates: CompactExercise[]) {
  const used = new Set<string>();
  const candidateQueue = candidates.filter((exercise) => exercise.imageUrls.length > 0);
  let cursor = 0;

  return blocks.map((block) => ({
    ...block,
    items: block.items
      .map((item) => {
        if (!used.has(item.exerciseId)) {
          used.add(item.exerciseId);
          return item;
        }

        while (cursor < candidateQueue.length && used.has(candidateQueue[cursor].id)) cursor += 1;
        const replacement = candidateQueue[cursor];
        if (!replacement) return null;
        used.add(replacement.id);
        cursor += 1;
        return {
          ...item,
          exerciseId: replacement.id,
          exercise: replacement,
          coachingNote: item.coachingNote || `Use ${replacement.title} here to keep the block varied and targeted.`,
        };
      })
      .filter((item): item is GeneratedWorkoutItem => Boolean(item)),
  })).filter((block) => block.items.length);
}

export async function validateWorkoutExercises(workout: GeneratedWorkout, candidates: CompactExercise[]) {
  const candidateById = new Map(candidates.map((exercise) => [exercise.id, exercise]));
  const candidateByLooseKey = new Map<string, CompactExercise>();

  for (const exercise of candidates) {
    candidateByLooseKey.set(keyForExerciseLookup(exercise.id), exercise);
    candidateByLooseKey.set(keyForExerciseLookup(exercise.slug), exercise);
    candidateByLooseKey.set(keyForExerciseLookup(exercise.title), exercise);
  }

  const warnings: string[] = [];
  const normalizedBlocks: GeneratedWorkoutBlock[] = diversifyWorkoutItems(workout.blocks, candidates)
    .map((block) => ({
      ...block,
      items: block.items
        .map((item): GeneratedWorkoutItem | null => {
          const matched = candidateById.get(item.exerciseId) ?? candidateByLooseKey.get(keyForExerciseLookup(item.exerciseId));
          if (!matched) {
            warnings.push(`Removed invalid exercise: ${item.exerciseId}`);
            return null;
          }
          return { ...item, exerciseId: matched.id, exercise: matched };
        })
        .filter((item): item is GeneratedWorkoutItem => Boolean(item)),
    }))
    .filter((block) => block.items.length);

  const selectedIds = [...new Set(normalizedBlocks.flatMap((block) => block.items.map((item) => item.exerciseId)).filter(uuidLike))];

  if (!selectedIds.length) return { workout: { ...workout, blocks: normalizedBlocks }, warnings: [...warnings, "No valid Supabase exercise IDs were selected."] };

  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase.from("exercises").select("id").in("id", selectedIds).eq("is_active", true);

  if (error) {
    return { workout: { ...workout, blocks: normalizedBlocks }, warnings: [...warnings, `Exercise validation warning: ${error.message}`] };
  }

  const rows = (data ?? []) as Array<{ id: string }>;
  const validIds = new Set(rows.map((row) => row.id));
  const blocks: GeneratedWorkoutBlock[] = normalizedBlocks
    .map((block) => ({
      ...block,
      items: block.items.filter((item) => {
        const valid = validIds.has(item.exerciseId);
        if (!valid) warnings.push(`Removed unavailable exercise: ${item.exercise?.title ?? item.exerciseId}`);
        return valid;
      }),
    }))
    .filter((block) => block.items.length);

  return { workout: { ...workout, blocks }, warnings };
}

function missingWorkoutTableReason(error: { code?: string; message?: string }) {
  if (error.code && WORKOUT_TABLE_MISSING_CODES.has(error.code)) return true;
  const message = error.message?.toLowerCase() ?? "";
  return message.includes("workouts") && (message.includes("does not exist") || message.includes("schema cache"));
}

export async function saveWorkoutForUser(userId: string, intake: WorkoutIntake, workout: GeneratedWorkout): Promise<WorkoutPersistence> {
  const supabase = getServerSupabaseClient() as unknown as {
    from: (table: string) => {
      insert: (values: unknown) => {
        select: (columns: string) => { single: () => Promise<{ data: { id: string } | null; error: { code?: string; message: string } | null }> };
      } & Promise<{ data: unknown; error: { code?: string; message: string } | null }>;
    };
  };
  const { data: workoutRow, error: workoutError } = await supabase
    .from("workouts")
    .insert({
      user_id: userId,
      title: workout.title,
      goal: intake.goal,
      duration_minutes: workout.durationMinutes,
      difficulty: workout.difficulty,
      equipment: workout.equipment,
      visibility: "community",
      intake_summary: JSON.stringify(intake),
      ai_model: workoutModel(),
    })
    .select("id")
    .single();

  if (workoutError) {
    if (missingWorkoutTableReason(workoutError)) {
      return { status: "preview_only", reason: "Workout tables are not available yet. See docs/workout-chat-mvp.md for the safe migration SQL." };
    }
    return { status: "preview_only", reason: `Workout preview generated, but saving failed: ${workoutError.message}` };
  }

  if (!workoutRow) {
    return { status: "preview_only", reason: "Workout preview generated, but Supabase did not return a saved workout ID." };
  }

  const items = workout.blocks.flatMap((block, blockIndex) =>
    block.items.map((item, itemIndex) => ({
      workout_id: workoutRow.id,
      exercise_id: item.exerciseId,
      order_index: blockIndex * 100 + itemIndex,
      block_type: block.type,
      block_title: block.title,
      sets: item.sets,
      reps: item.reps,
      duration_seconds: item.durationSeconds,
      rest_seconds: item.restSeconds,
      tempo: item.tempo,
      coaching_note: item.coachingNote,
    })),
  );

  if (items.length) {
    const { error: itemError } = await supabase.from("workout_items").insert(items);
    if (itemError) {
      return { status: "saved", workoutId: workoutRow.id, reason: `Workout saved, but item saving needs attention: ${itemError.message}` };
    }
  }

  return { status: "saved", workoutId: workoutRow.id };
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AuthLikeSupabase = any;

export async function updateWorkoutForUser(userId: string, workoutId: string, intake: WorkoutIntake, workout: GeneratedWorkout): Promise<WorkoutPersistence> {
  const supabase = getServerSupabaseClient() as unknown as AuthLikeSupabase;

  const { error: workoutError } = await supabase
    .from("workouts")
    .update({
      title: workout.title,
      goal: intake.goal,
      duration_minutes: workout.durationMinutes,
      difficulty: workout.difficulty,
      equipment: workout.equipment,
      intake_summary: JSON.stringify(intake),
      ai_model: workoutModel(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", workoutId)
    .eq("user_id", userId);

  if (workoutError) return { status: "preview_only", reason: `Workout update failed: ${workoutError.message}` };

  const { error: deleteError } = await supabase.from("workout_items").delete().eq("workout_id", workoutId);
  if (deleteError) return { status: "preview_only", reason: `Workout updated, but old items could not be replaced: ${deleteError.message}` };

  const items = workout.blocks.flatMap((block, blockIndex) =>
    block.items.map((item, itemIndex) => ({
      workout_id: workoutId,
      exercise_id: item.exerciseId,
      order_index: blockIndex * 100 + itemIndex,
      block_type: block.type,
      block_title: block.title,
      sets: item.sets,
      reps: item.reps,
      duration_seconds: item.durationSeconds,
      rest_seconds: item.restSeconds,
      tempo: item.tempo,
      coaching_note: item.coachingNote,
    })),
  );

  if (items.length) {
    const { error: itemError } = await supabase.from("workout_items").insert(items);
    if (itemError) return { status: "saved", workoutId, reason: `Workout updated, but item saving needs attention: ${itemError.message}` };
  }

  return { status: "saved", workoutId };
}

function workoutItemRow(workoutId: string, block: GeneratedWorkoutBlock, item: GeneratedWorkoutItem, orderIndex: number) {
  return {
    workout_id: workoutId,
    exercise_id: item.exerciseId,
    order_index: orderIndex,
    block_type: block.type,
    block_title: block.title,
    sets: item.sets,
    reps: item.reps,
    duration_seconds: item.durationSeconds,
    rest_seconds: item.restSeconds,
    tempo: item.tempo,
    coaching_note: item.coachingNote,
  };
}

export async function updateWorkoutForUserWithPatch(userId: string, workoutId: string, intake: WorkoutIntake, before: GeneratedWorkout, after: GeneratedWorkout, patch: WorkoutEditPatch): Promise<WorkoutPersistence> {
  const supabase = getServerSupabaseClient() as unknown as AuthLikeSupabase;

  const { error: workoutError } = await supabase
    .from("workouts")
    .update({
      title: after.title,
      goal: intake.goal,
      duration_minutes: after.durationMinutes,
      difficulty: after.difficulty,
      equipment: after.equipment,
      intake_summary: JSON.stringify(intake),
      ai_model: workoutModel(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", workoutId)
    .eq("user_id", userId);

  if (workoutError) return { status: "preview_only", reason: `Workout update failed: ${workoutError.message}` };

  for (const operation of patch.operations) {
    if (operation.op === "update_workout_meta") continue;

    const block = after.blocks[operation.blockIndex];
    if (!block) continue;

    if (operation.op === "update_block") {
      const ids = block.items.map((item) => item.itemId).filter(Boolean);
      if (ids.length) {
        const { error } = await supabase.from("workout_items").update({ block_type: block.type, block_title: block.title }).in("id", ids).eq("workout_id", workoutId);
        if (error) return { status: "preview_only", reason: `Block patch failed: ${error.message}` };
      }
      continue;
    }

    if (operation.op === "remove_item") {
      const itemId = before.blocks[operation.blockIndex]?.items[operation.itemIndex]?.itemId;
      if (!itemId) return { status: "preview_only", reason: "Patch could not remove an unsaved workout item." };
      const { error } = await supabase.from("workout_items").delete().eq("id", itemId).eq("workout_id", workoutId);
      if (error) return { status: "preview_only", reason: `Item removal patch failed: ${error.message}` };
      continue;
    }

    if (operation.op === "add_item") {
      const requestedPosition = Number.isFinite(operation.position) ? operation.position ?? block.items.length - 1 : block.items.length - 1;
      const position = Math.max(0, Math.min(Math.max(0, block.items.length - 1), requestedPosition));
      const item = block.items[position];
      if (!item) continue;
      const { error } = await supabase.from("workout_items").insert(workoutItemRow(workoutId, block, item, operation.blockIndex * 100 + position));
      if (error) return { status: "preview_only", reason: `Item add patch failed: ${error.message}` };
      continue;
    }

    const item = block.items[operation.itemIndex];
    const beforeItemId = before.blocks[operation.blockIndex]?.items[operation.itemIndex]?.itemId;
    if (beforeItemId && item?.itemId !== beforeItemId) return { status: "preview_only", reason: "Patch validation changed the target item; falling back to full workout update." };
    if (!item?.itemId) return { status: "preview_only", reason: "Patch could not update an unsaved workout item." };
    const { error } = await supabase
      .from("workout_items")
      .update({
        exercise_id: item.exerciseId,
        sets: item.sets,
        reps: item.reps,
        duration_seconds: item.durationSeconds,
        rest_seconds: item.restSeconds,
        tempo: item.tempo,
        coaching_note: item.coachingNote,
        block_type: block.type,
        block_title: block.title,
      })
      .eq("id", item.itemId)
      .eq("workout_id", workoutId);
    if (error) return { status: "preview_only", reason: `Item patch failed: ${error.message}` };
  }

  const persistedItems = after.blocks.flatMap((block, blockIndex) => block.items.map((item, itemIndex) => ({ item, orderIndex: blockIndex * 100 + itemIndex })));
  for (const { item, orderIndex } of persistedItems) {
    if (!item.itemId) continue;
    const { error } = await supabase.from("workout_items").update({ order_index: orderIndex }).eq("id", item.itemId).eq("workout_id", workoutId);
    if (error) return { status: "preview_only", reason: `Item ordering patch failed: ${error.message}` };
  }

  return { status: "saved", workoutId };
}

export async function loadGeneratedWorkoutForUser(userId: string, workoutId: string): Promise<GeneratedWorkout | null> {
  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from("workouts")
    .select(`id,title,goal,duration_minutes,difficulty,equipment,intake_summary,workout_items(id,order_index,block_type,block_title,sets,reps,duration_seconds,rest_seconds,tempo,coaching_note,exercises(id,title,slug,category,equipment_tags,difficulty,structure_json,image_urls,primary_muscles,secondary_muscles,movement_patterns,boxing_qualities,force,mechanic,source_equipment))`)
    .eq("id", workoutId)
    .eq("user_id", userId)
    .order("order_index", { referencedTable: "workout_items", ascending: true })
    .maybeSingle();

  if (error || !data) return null;
  const row = data as unknown as {
    title: string;
    goal: string | null;
    duration_minutes: number | null;
    difficulty: "beginner" | "intermediate" | "advanced" | null;
    equipment: string[] | null;
    workout_items: Array<{
      id: string;
      order_index: number | null;
      block_type: GeneratedWorkout["blocks"][number]["type"] | null;
      block_title: string | null;
      sets: number | null;
      reps: string | null;
      duration_seconds: number | null;
      rest_seconds: number | null;
      tempo: string | null;
      coaching_note: string | null;
      exercises: ExerciseRow | ExerciseRow[] | null;
    }> | null;
  };

  const blocks = new Map<string, GeneratedWorkout["blocks"][number]>();
  for (const item of [...(row.workout_items ?? [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))) {
    const type = item.block_type ?? "strength";
    const key = `${type}:${item.block_title ?? type}`;
    const exerciseRow = Array.isArray(item.exercises) ? item.exercises[0] : item.exercises;
    const exercise = exerciseRow ? toCompactExercise(exerciseRow) : null;
    if (!blocks.has(key)) blocks.set(key, { type, title: item.block_title ?? type, items: [] });
    blocks.get(key)?.items.push({
      itemId: item.id,
      exerciseId: exercise?.id ?? "",
      exercise: exercise ?? undefined,
      sets: item.sets,
      reps: item.reps,
      durationSeconds: item.duration_seconds,
      restSeconds: item.rest_seconds,
      tempo: item.tempo,
      coachingNote: item.coaching_note ?? "",
    });
  }

  return {
    title: row.title,
    summary: row.goal ?? "Saved Oracle Conditioning workout.",
    durationMinutes: row.duration_minutes ?? 30,
    difficulty: row.difficulty ?? "intermediate",
    equipment: row.equipment ?? [],
    blocks: [...blocks.values()],
    safetyNotes: [],
    progressionNote: "Send a message if you want to change anything.",
  };
}
