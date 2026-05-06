"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { CommunityWorkout, WorkoutDifficulty, WorkoutGoal } from "@/lib/community/workouts";

const goals: { value: "all" | WorkoutGoal; label: string }[] = [
  { value: "all", label: "All" },
  { value: "engine", label: "Engine" },
  { value: "strength", label: "Strength" },
  { value: "mobility", label: "Mobility" },
  { value: "power", label: "Power" },
  { value: "recovery", label: "Recovery" },
];

const difficulties: { value: "all" | WorkoutDifficulty; label: string }[] = [
  { value: "all", label: "Any level" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "all-levels", label: "All-levels" },
];

const durations = [
  { value: "all", label: "Any time" },
  { value: "under-30", label: "<30m" },
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

function titleCase(value: string) {
  return value.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function WorkoutCard({ workout }: { workout: CommunityWorkout }) {
  const meta = [workout.durationMinutes ? `${workout.durationMinutes} min` : null, titleCase(workout.difficulty), workout.equipment.slice(0, 2).join(", ")].filter(Boolean);

  return (
    <Link href={`/workouts/${workout.id}`} className="block rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{titleCase(workout.goal)}</p>
          <h2 className="mt-2 line-clamp-2 text-base font-semibold leading-5 tracking-tight text-slate-950">{workout.title}</h2>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{workout.durationMinutes}m</span>
      </div>

      <p className="mt-3 line-clamp-2 text-sm leading-5 text-slate-500">{workout.summary}</p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {meta.map((item) => (
          <span key={item} className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500">
            {item}
          </span>
        ))}
      </div>
    </Link>
  );
}

function Chip<T extends string>({ active, label, value, onSelect }: { active: boolean; label: string; value: T; onSelect: (value: T) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition ${active ? "bg-slate-950 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}
    >
      {label}
    </button>
  );
}

function SelectFilter<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void }) {
  return (
    <label className="min-w-0 flex-1">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as T)} className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-slate-400">
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CommunityGallery({ workouts }: { workouts: CommunityWorkout[] }) {
  const [isPending, startTransition] = useTransition();
  const [filters, setFilters] = useState<GalleryFilters>({ search: "", goal: "all", equipment: "", duration: "all", difficulty: "all" });

  const equipmentOptions = useMemo(() => {
    const unique = new Set<string>();
    workouts.forEach((workout) => workout.equipment.forEach((item) => unique.add(item)));
    return ["", ...Array.from(unique).sort((a, b) => a.localeCompare(b))].map((item) => ({ value: item, label: item || "Any kit" }));
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
      <div className="space-y-3">
        <input
          value={filters.search}
          onChange={(event) => updateFilter("search", event.target.value)}
          placeholder="Search plans"
          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-slate-400"
        />

        <div className="-mx-4 overflow-x-auto px-4">
          <div className="flex gap-2 pb-1">
            {goals.map((goal) => (
              <Chip key={goal.value} value={goal.value} label={goal.label} active={filters.goal === goal.value} onSelect={(value) => updateFilter("goal", value)} />
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <SelectFilter label="Duration" value={filters.duration} options={[...durations]} onChange={(value) => updateFilter("duration", value)} />
          <SelectFilter label="Difficulty" value={filters.difficulty} options={difficulties} onChange={(value) => updateFilter("difficulty", value)} />
        </div>

        <SelectFilter label="Equipment" value={filters.equipment} options={equipmentOptions} onChange={(value) => updateFilter("equipment", value)} />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{filteredWorkouts.length} plans</p>
        {isPending ? <p className="text-xs font-medium text-slate-400">Filtering</p> : null}
      </div>

      {filteredWorkouts.length ? (
        <section className="grid gap-3">
          {filteredWorkouts.map((workout) => <WorkoutCard key={workout.id} workout={workout} />)}
        </section>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No team plans found.</div>
      )}
    </div>
  );
}
