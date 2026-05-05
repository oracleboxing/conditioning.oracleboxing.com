"use client";

import Link from "next/link";
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

function WorkoutCard({ workout }: { workout: CommunityWorkout }) {
  return (
    <Link href={`/workouts/${workout.id}`} className="block rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-medium text-slate-950">{workout.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{workout.summary}</p>
        </div>
        <p className="shrink-0 text-sm text-slate-400">{workout.durationMinutes}m</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
        <span>{workout.goal}</span>
        <span>·</span>
        <span>{workout.difficulty}</span>
        <span>·</span>
        <span>{workout.equipment.join(", ")}</span>
      </div>
    </Link>
  );
}

function SelectFilter<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (value: T) => void }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value as T)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-[#007aff]">
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );
}

export function CommunityGallery({ workouts }: { workouts: CommunityWorkout[] }) {
  const [isPending, startTransition] = useTransition();
  const [filters, setFilters] = useState<GalleryFilters>({ search: "", goal: "all", equipment: "", duration: "all", difficulty: "all" });

  const equipmentOptions = useMemo(() => {
    const unique = new Set<string>();
    workouts.forEach((workout) => workout.equipment.forEach((item) => unique.add(item)));
    return ["", ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [workouts]);

  const filteredWorkouts = useMemo(() => {
    const query = normalise(filters.search);
    const equipment = normalise(filters.equipment);
    return workouts.filter((workout) => {
      const haystack = normalise([workout.title, workout.summary, workout.equipment.join(" ")].join(" "));
      return (!query || haystack.includes(query)) &&
        (filters.goal === "all" || workout.goal === filters.goal) &&
        (filters.difficulty === "all" || workout.difficulty === filters.difficulty) &&
        matchesDuration(workout, filters.duration) &&
        (!equipment || workout.equipment.some((item) => normalise(item) === equipment));
    });
  }, [filters, workouts]);

  function updateFilter<Key extends keyof GalleryFilters>(key: Key, value: GalleryFilters[Key]) {
    startTransition(() => setFilters((current) => ({ ...current, [key]: value })));
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[1fr_repeat(4,auto)]">
        <input value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} placeholder="Search" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-[#007aff]" />
        <SelectFilter value={filters.goal} options={goals} onChange={(value) => updateFilter("goal", value)} />
        <SelectFilter value={filters.duration} options={[...durations]} onChange={(value) => updateFilter("duration", value)} />
        <SelectFilter value={filters.difficulty} options={difficulties} onChange={(value) => updateFilter("difficulty", value)} />
        <select value={filters.equipment} onChange={(event) => updateFilter("equipment", event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-[#007aff]">
          {equipmentOptions.map((option) => <option key={option || "all"} value={option}>{option || "Any kit"}</option>)}
        </select>
      </div>

      <p className="text-sm text-slate-500">{filteredWorkouts.length} workouts{isPending ? " · filtering" : ""}</p>

      {filteredWorkouts.length ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredWorkouts.map((workout) => <WorkoutCard key={workout.id} workout={workout} />)}
        </section>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No community workouts found.</div>
      )}
    </div>
  );
}
