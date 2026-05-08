"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { CompactExercise, ExerciseSearchResult } from "@/lib/exercises/search";

function ExerciseImages({ exercise }: { exercise: CompactExercise }) {
  const images = exercise.imageUrls.slice(0, 2);

  if (!images.length) {
    return (
      <div className="flex h-52 items-center justify-center border-b border-dashed border-zinc-300 bg-zinc-50 text-center text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
        Exercise image
      </div>
    );
  }

  return (
    <div className="flex h-52 overflow-hidden border-b border-zinc-200 bg-zinc-100">
      {images.map((image, index) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={image}
          src={image}
          alt={`${exercise.title} image ${index + 1}`}
          className={`min-w-0 flex-1 object-cover ${images.length > 1 && index > 0 ? "border-l border-zinc-200" : ""}`}
        />
      ))}
    </div>
  );
}

function exerciseMeta(exercise: CompactExercise) {
  return [exercise.category, exercise.difficulty, exercise.sourceEquipment ?? exercise.equipment[0]]
    .filter(Boolean)
    .map((item) => String(item).replace(/-/g, " "))
    .join(" · ");
}

function ExerciseCard({ exercise }: { exercise: CompactExercise }) {
  const instruction = exercise.instructionsSummary ?? exercise.boxingSnc.notes;

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <ExerciseImages exercise={exercise} />
      <div className="p-4">
        <h3 className="text-xl font-semibold leading-6 tracking-tight text-black">{exercise.title}</h3>
        {exerciseMeta(exercise) ? <p className="mt-2 text-sm font-semibold capitalize leading-5 text-zinc-700">{exerciseMeta(exercise)}</p> : null}
        {instruction ? (
          <details className="group mt-4 border-t border-zinc-100 pt-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-zinc-700">
              <span>Instructions</span>
              <span className="text-lg leading-none text-zinc-400 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-sm leading-6 text-zinc-600">{instruction}</p>
          </details>
        ) : null}
      </div>
    </article>
  );
}

export function ExerciseLibrarySearch() {
  const [query, setQuery] = useState("");
  const [exercises, setExercises] = useState<CompactExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const searchQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ limit: "60" });
        if (searchQuery) params.set("q", searchQuery);
        const response = await fetch(`/api/exercises/search?${params.toString()}`, { signal: controller.signal });
        const payload = (await response.json()) as ExerciseSearchResult & { message?: string };
        if (!response.ok) throw new Error(payload.message ?? "Could not search exercises.");
        setExercises(payload.data ?? []);
      } catch (fetchError) {
        if ((fetchError as Error).name !== "AbortError") {
          setError(fetchError instanceof Error ? fetchError.message : "Could not search exercises.");
        }
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [searchQuery]);

  return (
    <section className="space-y-4">
      <div className="sticky top-0 z-20 -mx-4 bg-white/95 px-4 pb-3 pt-1 backdrop-blur">
        <input
          value={query}
          onChange={(event) => startTransition(() => setQuery(event.target.value))}
          placeholder="Search exercises"
          className="h-12 w-full rounded-full border border-zinc-200 bg-white px-5 text-sm font-medium text-black shadow-sm outline-none placeholder:text-zinc-400 focus:border-black"
        />
        <p className="mt-2 px-1 text-xs font-medium text-zinc-400">
          {loading || isPending ? "Searching..." : `${exercises.length} exercise${exercises.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <div className="space-y-5">
        {exercises.map((exercise) => <ExerciseCard key={exercise.id} exercise={exercise} />)}
      </div>

      {!loading && !exercises.length && !error ? (
        <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
          No exercises found.
        </div>
      ) : null}
    </section>
  );
}
