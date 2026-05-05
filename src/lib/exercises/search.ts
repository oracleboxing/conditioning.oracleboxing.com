import { getServerSupabaseClient } from "@/lib/supabase/server";
import type { ExerciseRow, Json } from "@/lib/supabase/types";

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 100;
const MUSCLE_SCAN_LIMIT = 1000;

const BASE_EXERCISE_SELECT = [
  "id",
  "title",
  "slug",
  "category",
  "summary",
  "description",
  "instructions_json",
  "equipment_tags",
  "difficulty",
  "structure_json",
  "is_active",
].join(",");

const ENRICHED_EXERCISE_SELECT = [
  BASE_EXERCISE_SELECT,
  "force",
  "mechanic",
  "source_equipment",
  "primary_muscles",
  "secondary_muscles",
  "image_urls",
  "movement_patterns",
  "boxing_qualities",
].join(",");

export type ExerciseSearchParams = {
  q?: string | null;
  equipment?: string | null;
  category?: string | null;
  muscle?: string | null;
  movementPattern?: string | null;
  boxingQuality?: string | null;
  level?: string | null;
  difficulty?: string | null;
  limit?: string | number | null;
};

export type CompactExercise = {
  id: string;
  slug: string;
  title: string;
  equipment: string[];
  category: string | null;
  muscles: {
    primary: string[];
    secondary: string[];
  };
  difficulty: string | null;
  instructionsSummary: string | null;
  imageUrl: string | null;
  imageUrls: string[];
  force: string | null;
  mechanic: string | null;
  sourceEquipment: string | null;
  movementPatterns: string[];
  boxingQualities: string[];
};

export type ExerciseSearchResult = {
  data: CompactExercise[];
  meta: {
    limit: number;
    returned: number;
    filters: {
      q: string | null;
      equipment: string[];
      category: string[];
      muscle: string[];
      movementPattern: string[];
      boxingQuality: string[];
      difficulty: string[];
    };
  };
};

function splitFilter(value: string | null | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeEquipmentFilter(value: string) {
  const item = normalizeToken(value);
  if (/^dumbbells?$|^dbs?$/.test(item)) return "dumbbell";
  if (/^kettlebells?$|^kbs?$/.test(item)) return "kettlebells";
  if (/^resistance bands?$|^bands?$|^mini bands?$|^loop bands?$/.test(item)) return "bands";
  if (/^barbells?$/.test(item)) return "barbell";
  if (/^body ?weight$|^none$|^no equipment$/.test(item)) return "bodyweight";
  return item;
}

function normalizeToken(value: string) {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, " ");
}

function escapeIlike(value: string) {
  return value.replace(/[\\%_*]/g, "\\$&").replace(/,/g, " ").trim();
}

function parseLimit(value: ExerciseSearchParams["limit"]) {
  const parsed = Number(value ?? DEFAULT_LIMIT);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.floor(parsed));
}

function jsonArray(value: Json | undefined): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function instructionsFrom(row: Pick<ExerciseRow, "instructions_json" | "description" | "summary">) {
  if (Array.isArray(row.instructions_json)) {
    return row.instructions_json.filter((item): item is string => typeof item === "string");
  }

  return [];
}

function summarizeInstructions(row: Pick<ExerciseRow, "instructions_json" | "description" | "summary">) {
  const firstInstruction = instructionsFrom(row)[0];
  const source = firstInstruction ?? row.summary ?? row.description ?? null;
  if (!source) return null;

  const oneLine = source.replace(/\s+/g, " ").trim();
  return oneLine.length > 220 ? `${oneLine.slice(0, 217).trimEnd()}...` : oneLine;
}

function imageUrlsFrom(row: Pick<ExerciseRow, "structure_json" | "image_urls">) {
  const columnUrls = Array.isArray(row.image_urls) ? row.image_urls : [];
  const structure = row.structure_json;
  const imagePaths = jsonArray(structure?.image_paths);
  const storageUrls = jsonArray(structure?.source_payload?.storage_image_urls);
  return [...new Set([...columnUrls, ...imagePaths, ...storageUrls].filter((url) => /^https?:\/\//i.test(url)))];
}

function musclesFrom(row: Pick<ExerciseRow, "structure_json" | "primary_muscles" | "secondary_muscles">) {
  const structure = row.structure_json;
  const primary = [
    ...(Array.isArray(row.primary_muscles) ? row.primary_muscles : []),
    ...jsonArray(structure?.primary_muscles),
    ...jsonArray(structure?.source_payload?.primaryMuscles),
  ];
  const secondary = [
    ...(Array.isArray(row.secondary_muscles) ? row.secondary_muscles : []),
    ...jsonArray(structure?.secondary_muscles),
    ...jsonArray(structure?.source_payload?.secondaryMuscles),
  ];

  return {
    primary: [...new Set(primary)],
    secondary: [...new Set(secondary)],
  };
}

function matchesMuscle(row: Pick<ExerciseRow, "structure_json" | "primary_muscles" | "secondary_muscles">, muscles: string[]) {
  if (!muscles.length) return true;
  const wanted = muscles.map(normalizeToken);
  const rowMuscles = musclesFrom(row);
  const available = [...rowMuscles.primary, ...rowMuscles.secondary].map(normalizeToken);

  return wanted.some((muscle) => available.some((candidate) => candidate === muscle || candidate.includes(muscle)));
}


function tokenSet(values: string[]) {
  return new Set(values.map(normalizeToken));
}

function searchScore(exercise: CompactExercise, filters: { q: string; equipment: string[]; category: string[]; muscle: string[]; movementPattern: string[]; boxingQuality: string[]; difficulty: string[] }) {
  let score = exercise.imageUrls.length ? 20 : 0;
  const haystack = `${exercise.title} ${exercise.category ?? ""} ${exercise.instructionsSummary ?? ""} ${exercise.sourceEquipment ?? ""}`.toLowerCase();

  if (filters.q) {
    const query = filters.q.toLowerCase();
    if (exercise.title.toLowerCase().includes(query)) score += 25;
    else if (haystack.includes(query)) score += 10;
  }

  if (filters.equipment.length) {
    const wanted = tokenSet(filters.equipment);
    const available = [...exercise.equipment, exercise.sourceEquipment ?? ""].map(normalizeToken);
    if (available.some((item) => wanted.has(item))) score += 18;
  }
  if (filters.category.length && exercise.category && tokenSet(filters.category).has(normalizeToken(exercise.category))) score += 10;
  if (filters.difficulty.length && exercise.difficulty && tokenSet(filters.difficulty).has(normalizeToken(exercise.difficulty))) score += 8;

  const wantedMuscles = tokenSet(filters.muscle);
  if (wantedMuscles.size && [...exercise.muscles.primary, ...exercise.muscles.secondary].map(normalizeToken).some((muscle) => wantedMuscles.has(muscle))) score += 14;

  const wantedPatterns = tokenSet(filters.movementPattern);
  const patternMatches = exercise.movementPatterns.map(normalizeToken).filter((pattern) => wantedPatterns.has(pattern)).length;
  score += patternMatches * 16;

  const wantedQualities = tokenSet(filters.boxingQuality);
  const qualityMatches = exercise.boxingQualities.map(normalizeToken).filter((quality) => wantedQualities.has(quality)).length;
  score += qualityMatches * 18;

  return score;
}

export function toCompactExercise(row: ExerciseRow): CompactExercise {
  const imageUrls = imageUrlsFrom(row);
  return {
    id: row.id,
    slug: row.slug ?? row.id,
    title: row.title,
    equipment: row.equipment_tags ?? [],
    category: row.category,
    muscles: musclesFrom(row),
    difficulty: row.difficulty,
    instructionsSummary: summarizeInstructions(row),
    imageUrl: imageUrls[0] ?? null,
    imageUrls,
    force: row.force ?? row.structure_json?.force ?? row.structure_json?.source_payload?.force ?? null,
    mechanic: row.mechanic ?? row.structure_json?.mechanic ?? row.structure_json?.source_payload?.mechanic ?? null,
    sourceEquipment: row.source_equipment ?? row.structure_json?.source_payload?.equipment ?? row.equipment_tags?.[0] ?? null,
    movementPatterns: row.movement_patterns ?? [],
    boxingQualities: row.boxing_qualities ?? [],
  };
}

export async function searchExercises(params: ExerciseSearchParams): Promise<ExerciseSearchResult> {
  const q = (params.q ?? "").trim();
  const equipment = splitFilter(params.equipment).map(normalizeEquipmentFilter);
  const category = splitFilter(params.category);
  const muscle = splitFilter(params.muscle);
  const movementPattern = splitFilter(params.movementPattern);
  const boxingQuality = splitFilter(params.boxingQuality);
  const difficulty = splitFilter(params.difficulty ?? params.level);
  const limit = parseLimit(params.limit);

  const supabase = getServerSupabaseClient();
  const scanLimit = muscle.length || movementPattern.length || boxingQuality.length || limit < MUSCLE_SCAN_LIMIT ? MUSCLE_SCAN_LIMIT : limit;

  const buildQuery = (select: string) => {
    let query = supabase
      .from("exercises")
      .select(select)
      .eq("is_active", true)
      .eq("structure_json->>source", "free-exercise-db")
      .order("title", { ascending: true });

    if (q) {
      const term = escapeIlike(q);
      query = query.or(`title.ilike.%${term}%,slug.ilike.%${term}%,summary.ilike.%${term}%,description.ilike.%${term}%`);
    }

    if (equipment.length) query = query.overlaps("equipment_tags", equipment);
    if (category.length) query = query.in("category", category);
    if (difficulty.length) query = query.in("difficulty", difficulty);

    return query.limit(scanLimit);
  };

  let { data, error } = await buildQuery(ENRICHED_EXERCISE_SELECT);
  if (error && /column|schema cache|could not find/i.test(error.message)) {
    const fallback = await buildQuery(BASE_EXERCISE_SELECT);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw new Error(`Exercise search failed: ${error.message}`);

  const wantedPatterns = movementPattern.map(normalizeToken);
  const wantedQualities = boxingQuality.map(normalizeToken);
  const filters = { q, equipment, category, muscle, movementPattern, boxingQuality, difficulty };
  const filtered = (data ?? [])
    .filter((row) => matchesMuscle(row, muscle))
    .map(toCompactExercise)
    .filter((exercise) => exercise.imageUrls.length > 0)
    .filter((exercise) => !wantedPatterns.length || wantedPatterns.some((pattern) => exercise.movementPatterns.map(normalizeToken).includes(pattern)))
    .filter((exercise) => !wantedQualities.length || wantedQualities.some((quality) => exercise.boxingQualities.map(normalizeToken).includes(quality)))
    .map((exercise) => ({ exercise, score: searchScore(exercise, filters) }))
    .sort((a, b) => b.score - a.score || a.exercise.title.localeCompare(b.exercise.title))
    .slice(0, limit)
    .map(({ exercise }) => exercise);

  return {
    data: filtered,
    meta: {
      limit,
      returned: filtered.length,
      filters: {
        q: q || null,
        equipment,
        category,
        muscle,
        movementPattern,
        boxingQuality,
        difficulty,
      },
    },
  };
}
