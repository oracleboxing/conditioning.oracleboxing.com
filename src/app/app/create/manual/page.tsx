"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { CompactExercise, ExerciseSearchResult } from "@/lib/exercises/search";

function ExerciseThumb({ exercise }: { exercise: CompactExercise }) {
  return (
    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-zinc-100">
      {exercise.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={exercise.imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center text-xs font-bold text-zinc-300">S&C</div>
      )}
    </div>
  );
}

function meta(exercise: CompactExercise) {
  return [exercise.category, exercise.sourceEquipment ?? exercise.equipment[0], exercise.difficulty]
    .filter(Boolean)
    .map((item) => String(item).replace(/-/g, " "))
    .join(" · ");
}

type ExerciseFilter = {
  id: string;
  label: string;
  group: "Body part" | "Function";
  params: Partial<Record<"muscle" | "movementPattern" | "boxingQuality", string>>;
};

const EXERCISE_FILTERS: ExerciseFilter[] = [
  { id: "shoulders", label: "Shoulders / guard", group: "Body part", params: { muscle: "shoulders" } },
  { id: "core", label: "Abs + trunk", group: "Body part", params: { muscle: "abdominals" } },
  { id: "glutes", label: "Glutes + hips", group: "Body part", params: { muscle: "glutes" } },
  { id: "legs", label: "Legs / footwork", group: "Body part", params: { boxingQuality: "footwork-base" } },
  { id: "back", label: "Back / posture", group: "Body part", params: { muscle: "middle back" } },
  { id: "chest", label: "Chest / push", group: "Body part", params: { muscle: "chest" } },
  { id: "rotation", label: "Rotation", group: "Function", params: { movementPattern: "rotation" } },
  { id: "anti-rotation", label: "Anti-rotation", group: "Function", params: { movementPattern: "anti-rotation" } },
  { id: "punch-power", label: "Punch power", group: "Function", params: { boxingQuality: "punch-transfer" } },
  { id: "gas-tank", label: "Gas tank", group: "Function", params: { boxingQuality: "gas-tank" } },
  { id: "mobility", label: "Mobility / reset", group: "Function", params: { movementPattern: "mobility" } },
  { id: "shoulder-health", label: "Shoulder health", group: "Function", params: { movementPattern: "shoulder-health" } },
];

function groupedFilters(group: ExerciseFilter["group"]) {
  return EXERCISE_FILTERS.filter((filter) => filter.group === group);
}

export default function ManualWorkoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/app";
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CompactExercise[]>([]);
  const [selected, setSelected] = useState<CompactExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const searchQuery = useMemo(() => query.trim(), [query]);
  const activeFilter = EXERCISE_FILTERS.find((filter) => filter.id === activeFilterId) ?? null;

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ limit: "40" });
        if (searchQuery) params.set("q", searchQuery);
        if (activeFilter) {
          for (const [key, value] of Object.entries(activeFilter.params)) {
            if (value) params.set(key, value);
          }
        }
        const response = await fetch(`/api/exercises/search?${params.toString()}`, { signal: controller.signal });
        const payload = (await response.json()) as ExerciseSearchResult & { message?: string };
        if (!response.ok) throw new Error(payload.message ?? "Exercise search failed.");
        setResults(payload.data ?? []);
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") setError(caught instanceof Error ? caught.message : "Exercise search failed.");
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [activeFilter, searchQuery]);

  function toggleExercise(exercise: CompactExercise) {
    setSelected((current) => {
      if (current.some((item) => item.id === exercise.id)) return current.filter((item) => item.id !== exercise.id);
      return [...current, exercise].slice(0, 20);
    });
  }

  async function createWorkout() {
    if (!selected.length || saving) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/workouts/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseIds: selected.map((exercise) => exercise.id) }),
      });
      const payload = (await response.json()) as { url?: string; message?: string };
      if (!response.ok || !payload.url) throw new Error(payload.message ?? "Could not create workout.");
      router.push(payload.url);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create workout.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex h-full min-h-0 flex-col bg-white text-black">
      <div className="z-40 flex shrink-0 items-center justify-between bg-white px-4 pb-3 pt-1">
        <Link href={next} className="rounded-full border border-zinc-200 bg-white/85 px-3 py-2 text-sm font-semibold text-zinc-600 shadow-sm backdrop-blur transition hover:text-black">
          ← Back
        </Link>
        <button
          type="button"
          onClick={() => void createWorkout()}
          disabled={!selected.length || saving}
          className="rounded-full bg-[#007aff] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,122,255,0.28)] transition hover:bg-[#2f96ff] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "Creating..." : "Create"}
        </button>
      </div>

      <section className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-6 pt-1">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-[-0.04em] text-black">Create manually</h1>
          <p className="text-sm leading-5 text-zinc-500">Pick exercises. AI will order them into a sensible boxing S&C session when you create it.</p>
        </div>

        <div className="-mx-4 mt-5 bg-white px-4 pb-3 pt-2">
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(event) => startTransition(() => setQuery(event.target.value))}
              placeholder="Search exercises"
              className="h-12 min-w-0 flex-1 rounded-full border border-zinc-200 bg-white px-5 text-sm font-medium text-black shadow-sm outline-none placeholder:text-zinc-400 focus:border-black"
            />
            <button
              type="button"
              onClick={() => setFilterOpen((open) => !open)}
              className={`h-12 shrink-0 rounded-full border px-4 text-sm font-semibold shadow-sm transition ${activeFilter ? "border-blue-100 bg-blue-50 text-[#007aff]" : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"}`}
            >
              Filter
            </button>
          </div>

          {filterOpen ? (
            <div className="mt-3 rounded-3xl border border-zinc-200 bg-white p-3 shadow-[0_16px_50px_rgba(15,23,42,0.14)]">
              <button
                type="button"
                onClick={() => {
                  setActiveFilterId(null);
                  setFilterOpen(false);
                }}
                className={`mb-2 w-full rounded-2xl px-3 py-2 text-left text-sm font-semibold transition ${!activeFilter ? "bg-zinc-950 text-white" : "text-zinc-700 hover:bg-zinc-100"}`}
              >
                All exercises
              </button>
              {(["Body part", "Function"] as const).map((group) => (
                <div key={group} className="mt-3">
                  <p className="px-1 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">{group}</p>
                  <div className="flex flex-wrap gap-2">
                    {groupedFilters(group).map((filter) => (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => {
                          setActiveFilterId(filter.id);
                          setFilterOpen(false);
                        }}
                        className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${activeFilterId === filter.id ? "border-blue-100 bg-blue-50 text-[#007aff]" : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"}`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <p className="mt-2 px-1 text-xs font-medium text-zinc-400">
            {loading || isPending ? "Searching..." : `${results.length} exercises`} · {selected.length} selected{activeFilter ? ` · ${activeFilter.label}` : ""}
          </p>
        </div>

        {selected.length ? (
          <div className="mb-4 flex flex-wrap gap-2 pb-1">
            {selected.map((exercise, index) => (
              <button key={exercise.id} type="button" onClick={() => toggleExercise(exercise)} className="max-w-full rounded-full border border-blue-100 bg-blue-50 px-3 py-2 text-left text-xs font-semibold text-[#007aff]">
                <span className="line-clamp-1">{index + 1}. {exercise.title} ×</span>
              </button>
            ))}
          </div>
        ) : null}

        {error ? <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        <div className="space-y-3">
          {results.map((exercise) => {
            const active = selected.some((item) => item.id === exercise.id);
            return (
              <button
                key={exercise.id}
                type="button"
                onClick={() => toggleExercise(exercise)}
                className={`flex w-full items-center gap-3 rounded-3xl border bg-white p-3 text-left shadow-sm transition ${active ? "border-[#007aff] ring-2 ring-blue-100" : "border-zinc-200 hover:border-zinc-300"}`}
              >
                <ExerciseThumb exercise={exercise} />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold leading-5 text-black">{exercise.title}</p>
                  {meta(exercise) ? <p className="mt-1 truncate text-xs capitalize text-zinc-500">{meta(exercise)}</p> : null}
                </div>
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-lg font-semibold ${active ? "bg-[#007aff] text-white" : "bg-zinc-100 text-zinc-500"}`}>{active ? "✓" : "+"}</span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
