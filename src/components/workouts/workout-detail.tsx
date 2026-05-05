import Image from "next/image";
import Link from "next/link";
import type { WorkoutDisplay, WorkoutItem, WorkoutSection } from "@/lib/workouts/types";

function plural(value: number, unit: string) {
  return `${value} ${unit}${value === 1 ? "" : "s"}`;
}

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

function prescription(item: WorkoutItem) {
  const parts = [
    item.sets ? plural(item.sets, "set") : null,
    item.reps ? item.reps : null,
    formatDuration(item.durationSeconds),
    item.restSeconds ? `${item.restSeconds}s rest` : null,
    item.tempo ? `tempo ${item.tempo}` : null,
  ].filter(Boolean);

  return parts.length ? parts.join(" · ") : "As prescribed";
}

function StatusPill({ visibility }: { visibility: WorkoutDisplay["visibility"] }) {
  const community = visibility === "community";
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${
        community
          ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border border-slate-300 bg-slate-100 text-slate-700"
      }`}
    >
      {community ? "Community" : "Private"}
    </span>
  );
}

function ExerciseImage({ item }: { item: WorkoutItem }) {
  if (item.exercise.imageUrl) {
    return (
      <Image
        src={item.exercise.imageUrl}
        alt=""
        width={360}
        height={360}
        unoptimized
        className="h-44 w-full rounded-2xl border border-slate-200 bg-slate-100 object-cover sm:h-full"
      />
    );
  }

  return (
    <div className="flex h-44 w-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-center text-xs font-bold uppercase tracking-[0.14em] text-slate-500 sm:h-full">
      Exercise image
    </div>
  );
}

function ExerciseCard({ item }: { item: WorkoutItem }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid sm:grid-cols-[180px_1fr] sm:gap-5 sm:p-5">
      <ExerciseImage item={item} />
      <div className="mt-5 sm:mt-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7db7ff]">Step {item.orderIndex}</p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{item.exercise.name}</h3>
            <p className="mt-2 text-sm font-semibold text-slate-500">{prescription(item)}</p>
          </div>
          {item.exercise.category ? (
            <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {item.exercise.category}
            </span>
          ) : null}
        </div>

        {item.exercise.equipment.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {item.exercise.equipment.map((piece) => (
              <span key={piece} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                {piece}
              </span>
            ))}
          </div>
        ) : null}

        {item.coachingNote ? (
          <div className="mt-5 rounded-2xl border border-[#007aff]/25 bg-[#007aff]/10 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7db7ff]">Coach note</p>
            <p className="mt-2 text-sm leading-6 text-slate-900">{item.coachingNote}</p>
          </div>
        ) : null}

        {item.coachingCues.length ? (
          <div className="mt-5">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Cues</p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {item.coachingCues.slice(0, 4).map((cue) => (
                <li key={cue} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
                  {cue}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {item.boxingRelevance ? (
          <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
            <span className="font-bold text-slate-950">Boxing relevance: </span>
            {item.boxingRelevance}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function WorkoutSectionBlock({ section }: { section: WorkoutSection }) {
  return (
    <section className="mt-10">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#7db7ff]">{section.eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{section.title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{section.description}</p>
      </div>
      <div className="grid gap-4">
        {section.items.map((item) => (
          <ExerciseCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

export function WorkoutDetail({ workout, notice }: { workout: WorkoutDisplay; notice?: string }) {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <div className="mx-auto w-full max-w-none px-4 py-6 sm:px-6 sm:py-8">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link href="/app" className="text-sm font-semibold text-slate-500 transition hover:text-slate-950">
                ← Back to app
              </Link>
              <p className="mt-6 text-sm font-semibold uppercase tracking-[0.1em] text-[#7db7ff]">Oracle Performance Lab</p>
              <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {workout.title}
              </h1>
              {workout.goal ? <p className="mt-5 max-w-3xl text-base leading-7 text-slate-500">{workout.goal}</p> : null}
            </div>
            <StatusPill visibility={workout.visibility} />
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Duration</p>
              <p className="mt-2 text-xl font-semibold">{workout.durationMinutes ? `${workout.durationMinutes} min` : "Flexible"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Level</p>
              <p className="mt-2 text-xl font-semibold">{workout.difficulty ?? "Adaptive"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Equipment</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                {workout.equipment.length ? workout.equipment.join(", ") : "Bodyweight or as listed"}
              </p>
            </div>
          </div>

          {workout.intakeSummary ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Intake summary</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{workout.intakeSummary}</p>
            </div>
          ) : null}
        </header>

        {notice ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">{notice}</div>
        ) : null}

        {workout.sections.map((section) => (
          <WorkoutSectionBlock key={section.type} section={section} />
        ))}

        <section className="mt-10 grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#7db7ff]">Next actions</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">Save it, remix it, or share it later.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">CTA placeholders are here so the future AI chat and community gallery can hook in cleanly.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button className="rounded-full bg-[#007aff] px-5 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-[#2f96ff]">
              Save workout
            </button>
            <button className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-slate-950 transition hover:bg-slate-100">
              Remix
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
