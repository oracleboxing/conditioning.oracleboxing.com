import { getServerSupabaseClient } from "@/lib/supabase/server";
import type { ExerciseRow, ExerciseStructureJson, Json } from "@/lib/supabase/types";

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 100;
const MUSCLE_SCAN_LIMIT = 1000;

const EXERCISE_SELECT = [
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

export type ExerciseSearchParams = {
  q?: string | null;
  equipment?: string | null;
  category?: string | null;
  muscle?: string | null;
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

function firstImageUrl(structure: ExerciseStructureJson | null) {
  const imagePaths = jsonArray(structure?.image_paths);
  const storageUrls = jsonArray(structure?.source_payload?.storage_image_urls);
  const images = [...imagePaths, ...storageUrls].filter((url) => /^https?:\/\//i.test(url));
  return images[0] ?? null;
}

function musclesFrom(structure: ExerciseStructureJson | null) {
  const primary = [
    ...jsonArray(structure?.primary_muscles),
    ...jsonArray(structure?.source_payload?.primaryMuscles),
  ];
  const secondary = [
    ...jsonArray(structure?.secondary_muscles),
    ...jsonArray(structure?.source_payload?.secondaryMuscles),
  ];

  return {
    primary: [...new Set(primary)],
    secondary: [...new Set(secondary)],
  };
}

function matchesMuscle(row: Pick<ExerciseRow, "structure_json">, muscles: string[]) {
  if (!muscles.length) return true;
  const wanted = muscles.map(normalizeToken);
  const rowMuscles = musclesFrom(row.structure_json);
  const available = [...rowMuscles.primary, ...rowMuscles.secondary].map(normalizeToken);

  return wanted.some((muscle) => available.some((candidate) => candidate === muscle || candidate.includes(muscle)));
}

function toCompactExercise(row: ExerciseRow): CompactExercise {
  return {
    id: row.id,
    slug: row.slug ?? row.id,
    title: row.title,
    equipment: row.equipment_tags ?? [],
    category: row.category,
    muscles: musclesFrom(row.structure_json),
    difficulty: row.difficulty,
    instructionsSummary: summarizeInstructions(row),
    imageUrl: firstImageUrl(row.structure_json),
  };
}

export async function searchExercises(params: ExerciseSearchParams): Promise<ExerciseSearchResult> {
  const q = (params.q ?? "").trim();
  const equipment = splitFilter(params.equipment);
  const category = splitFilter(params.category);
  const muscle = splitFilter(params.muscle);
  const difficulty = splitFilter(params.difficulty ?? params.level);
  const limit = parseLimit(params.limit);

  const supabase = getServerSupabaseClient();
  let query = supabase
    .from("exercises")
    .select(EXERCISE_SELECT)
    .eq("is_active", true)
    .eq("structure_json->>source", "free-exercise-db")
    .order("title", { ascending: true });

  if (q) {
    const term = escapeIlike(q);
    query = query.or(`title.ilike.%${term}%,slug.ilike.%${term}%,summary.ilike.%${term}%,description.ilike.%${term}%`);
  }

  if (equipment.length) {
    query = query.overlaps("equipment_tags", equipment);
  }

  if (category.length) {
    query = query.in("category", category);
  }

  if (difficulty.length) {
    query = query.in("difficulty", difficulty);
  }

  const scanLimit = muscle.length ? MUSCLE_SCAN_LIMIT : limit;
  const { data, error } = await query.limit(scanLimit);

  if (error) {
    throw new Error(`Exercise search failed: ${error.message}`);
  }

  const filtered = (data ?? []).filter((row) => matchesMuscle(row, muscle)).slice(0, limit);

  return {
    data: filtered.map(toCompactExercise),
    meta: {
      limit,
      returned: filtered.length,
      filters: {
        q: q || null,
        equipment,
        category,
        muscle,
        difficulty,
      },
    },
  };
}
