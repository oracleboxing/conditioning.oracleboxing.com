"use client";

import { useMemo, useState, useTransition } from "react";
import type { CommunityWorkout, WorkoutDifficulty, WorkoutGoal } from "@/lib/community/workouts";

const goals: { value: "all" | WorkoutGoal; label: string }[] = [
  { value: "all", label: "All goals" },
  { value: "engine", label: "Engine" },
  { value: "strength", label: "Strength" },
  { value: "mobility", label: "Mobility" },
  { value: "power", label: "Power" },
  { value: "recovery", label: "Recovery" },
];

const difficulties: { value: "all" | WorkoutDifficulty; label: string }[] = [
  { value: "all", label: "All levels" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "all-levels", label: "All-levels" },
];

const durations = [
  { value: "all", label: "Any duration" },
  { value: "under-30", label: "Under 30m" },
  { value: "30-40", label: "30-40m" },
  { value: "40-plus", label: "40m+" },
] as const;

type DurationFilter = (typeof durations)[number]["value"];

type GalleryFilters = {
  search: string;
  goal: "all" | WorkoutGoal;
  equipment: string;
  duration: DurationFilter;
  difficulty: "all" | WorkoutDifficulty;
};

function matchesDuration(workout: CommunityWorkout, duration: DurationFilter) {
  if (duration === "all") return true;
  if (duration === "under-30") return workout.durationMinutes < 30;
  if (duration === "30-40") return workout.durationMinutes >= 30 && workout.durationMinutes <= 40;
  return workout.durationMinutes > 40;
}

function normalise(value: string) {
  return value.toLowerCase().trim();
}

function goalLabel(goal: WorkoutGoal) {
  return goals.find((option) => option.value === goal)?.label ?? goal;
}

function difficultyLabel(difficulty: WorkoutDifficulty) {
  return difficulties.find((option) => option.value === difficulty)?.label ?? difficulty;
}

function WorkoutCard({ workout }: { workout: CommunityWorkout }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b111a] p-5 shadow-2xl shadow-black/20 transition hover:-translate-y-1 hover:border-[#007aff]/50 hover:bg-[#0f1724]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#b8ff3d]">{goalLabel(workout.goal)}</p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-[#f6faff]">{workout.title}</h2>
        </div>
        <div className="rounded-2xl bg-[#101a28] px-3 py-2 text-right">
          <p className="font-mono text-2xl font-black text-[#b8ff3d]">{workout.durationMinutes}</p>
          <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-[#7a8799]">min</p>
        </div>
      </div>

      <p className="mt-4 flex-1 text-sm leading-6 text-[#9aa7b8]">{workout.summary}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-bold text-[#f6faff]">
          {difficultyLabel(workout.difficulty)}
        </span>
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-bold text-[#f6faff]">
          {workout.blockCount || 4} blocks
        </span>
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-bold text-[#f6faff]">
          {workout.savedCount} saves
        </span>
      </div>

      <div className="mt-5 min-h-16 rounded-3xl border border-white/10 bg-[#05070a] p-3">
        <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-[#7a8799]">Kit</p>
        <p className="mt-2 text-sm font-semibold text-[#f6faff]">{workout.equipment.join(" + ")}</p>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
        <div>
          <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-[#7a8799]">Built by</p>
          <p className="mt-1 text-sm font-bold text-[#f6faff]">{workout.builderName}</p>
        </div>
        <button className="rounded-full bg-[#007aff] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white transition group-hover:bg-[#2f96ff]">
          View logic
        </button>
      </div>
    </article>
  );
}

function SelectFilter<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="block">
      <span className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-[#7a8799]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-[#05070a] px-4 py-3 text-sm font-bold text-[#f6faff] outline-none transition focus:border-[#007aff]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CommunityGallery({ workouts, sourceNote }: { workouts: CommunityWorkout[]; sourceNote: string | null }) {
  const [isPending, startTransition] = useTransition();
  const [filters, setFilters] = useState<GalleryFilters>({
    search: "",
    goal: "all",
    equipment: "",
    duration: "all",
    difficulty: "all",
  });

  const equipmentOptions = useMemo(() => {
    const unique = new Set<string>();
    workouts.forEach((workout) => workout.equipment.forEach((item) => unique.add(item)));
    return ["", ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [workouts]);

  const filteredWorkouts = useMemo(() => {
    const query = normalise(filters.search);
    const equipment = normalise(filters.equipment);

    return workouts.filter((workout) => {
      const haystack = normalise([workout.title, workout.summary, workout.builderName, workout.equipment.join(" ")].join(" "));
      const equipmentMatch = !equipment || workout.equipment.some((item) => normalise(item) === equipment);

      return (
        (!query || haystack.includes(query)) &&
        (filters.goal === "all" || workout.goal === filters.goal) &&
        (filters.difficulty === "all" || workout.difficulty === filters.difficulty) &&
        matchesDuration(workout, filters.duration) &&
        equipmentMatch
      );
    });
  }, [filters, workouts]);

  function updateFilter<Key extends keyof GalleryFilters>(key: Key, value: GalleryFilters[Key]) {
    startTransition(() => setFilters((current) => ({ ...current, [key]: value })));
  }

  function clearFilters() {
    startTransition(() =>
      setFilters({ search: "", goal: "all", equipment: "", duration: "all", difficulty: "all" }),
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-white/10 bg-[#0b111a] p-4 shadow-2xl shadow-black/20 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_repeat(4,1fr)]">
          <label className="block">
            <span className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-[#7a8799]">Search</span>
            <input
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder="Search workouts, kit or creator"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[#05070a] px-4 py-3 text-sm font-bold text-[#f6faff] outline-none transition placeholder:text-[#526071] focus:border-[#007aff]"
            />
          </label>

          <SelectFilter label="Goal" value={filters.goal} options={goals} onChange={(value) => updateFilter("goal", value)} />
          <SelectFilter label="Duration" value={filters.duration} options={[...durations]} onChange={(value) => updateFilter("duration", value)} />
          <SelectFilter label="Difficulty" value={filters.difficulty} options={difficulties} onChange={(value) => updateFilter("difficulty", value)} />

          <label className="block">
            <span className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-[#7a8799]">Equipment</span>
            <select
              value={filters.equipment}
              onChange={(event) => updateFilter("equipment", event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[#05070a] px-4 py-3 text-sm font-bold text-[#f6faff] outline-none transition focus:border-[#007aff]"
            >
              {equipmentOptions.map((option) => (
                <option key={option || "all"} value={option}>
                  {option || "Any kit"}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-[#9aa7b8]">
            Showing <span className="text-[#f6faff]">{filteredWorkouts.length}</span> of {workouts.length} shared workouts
            {isPending ? <span className="ml-2 text-[#b8ff3d]">Filtering...</span> : null}
          </p>
          <button onClick={clearFilters} className="rounded-full border border-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#f6faff] transition hover:bg-white/10">
            Reset filters
          </button>
        </div>
      </section>

      {sourceNote ? (
        <div className="rounded-3xl border border-[#b8ff3d]/20 bg-[#b8ff3d]/10 px-5 py-4 text-sm leading-6 text-[#d7ff91]">
          {sourceNote}
        </div>
      ) : null}

      {filteredWorkouts.length ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredWorkouts.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} />
          ))}
        </section>
      ) : (
        <section className="rounded-[2rem] border border-white/10 bg-[#0b111a] px-6 py-16 text-center">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#b8ff3d]">No matching sessions</p>
          <h2 className="mt-4 text-3xl font-black text-[#f6faff]">The gallery is not empty, your filters are just being dramatic.</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#9aa7b8]">
            Loosen the kit, duration or goal filters and the member-built conditioning sessions will come back.
          </p>
          <button onClick={clearFilters} className="mt-8 rounded-full bg-[#007aff] px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-[#2f96ff]">
            Clear filters
          </button>
        </section>
      )}
    </div>
  );
}
