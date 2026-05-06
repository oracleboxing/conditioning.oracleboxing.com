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
    item.reps,
    formatDuration(item.durationSeconds),
    item.restSeconds !== null ? `rest ${item.restSeconds}s` : null,
    item.tempo ? `tempo ${item.tempo}` : null,
  ].filter(Boolean);

  return parts.length ? parts.join(" · ") : "As prescribed";
}

function detailCopy(item: WorkoutItem) {
  const instructions = item.exercise.instructions.filter(Boolean);
  const firstInstructions = instructions.slice(0, 4);
  const cuePool = [item.coachingNote, ...item.coachingCues, ...instructions].filter((cue): cue is string => Boolean(cue?.trim()));
  const cues = [...new Set(cuePool)].slice(0, 5);

  return { firstInstructions, cues };
}

function JoinedExerciseImages({ item }: { item: WorkoutItem }) {
  const images = item.exercise.imageUrls.length ? item.exercise.imageUrls.slice(0, 2) : item.exercise.imageUrl ? [item.exercise.imageUrl] : [];

  if (!images.length) {
    return (
      <div className="flex h-28 w-56 shrink-0 items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 text-center text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
        Exercise image
      </div>
    );
  }

  return (
    <div className="flex h-28 w-56 shrink-0 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 sm:h-32 sm:w-64">
      {images.map((url, imageIndex) => (
        <Image
          key={url}
          src={url}
          alt={`${item.exercise.name} image ${imageIndex + 1}`}
          width={220}
          height={220}
          unoptimized
          className={`h-full min-w-0 flex-1 object-cover ${images.length > 1 && imageIndex > 0 ? "border-l border-zinc-200" : ""}`}
        />
      ))}
    </div>
  );
}

function ExerciseCard({ item }: { item: WorkoutItem }) {
  const { firstInstructions, cues } = detailCopy(item);

  return (
    <article className="flex flex-col gap-5 border-t border-zinc-100 py-6 first:border-t-0 sm:flex-row">
      <JoinedExerciseImages item={item} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">Step {item.orderIndex}</p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-black">{item.exercise.name}</h3>
            <p className="mt-2 text-sm font-medium leading-6 text-zinc-600">{prescription(item)}</p>
          </div>
          {item.exercise.category ? (
            <span className="w-fit rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
              {item.exercise.category}
            </span>
          ) : null}
        </div>

        {item.coachingNote ? <p className="mt-4 text-sm leading-6 text-zinc-700">{item.coachingNote}</p> : null}

        {firstInstructions.length ? (
          <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">How to do it</p>
            <ol className="mt-3 space-y-2 text-sm leading-6 text-zinc-600">
              {firstInstructions.map((instruction, index) => (
                <li key={`${item.id}-instruction-${index}`} className="flex gap-3">
                  <span className="mt-0.5 text-xs font-semibold text-zinc-400">{index + 1}</span>
                  <span>{instruction}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {cues.length ? (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Cues</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {cues.map((cue) => (
                <span key={cue} className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium leading-5 text-zinc-600">
                  {cue}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {item.boxingRelevance ? (
          <p className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm leading-6 text-zinc-700">
            <span className="font-semibold text-black">Boxing relevance: </span>
            {item.boxingRelevance}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function WorkoutSectionBlock({ section }: { section: WorkoutSection }) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">{section.eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-black">{section.title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">{section.description}</p>
      </div>
      <div className="mt-5">
        {section.items.map((item) => (
          <ExerciseCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-black">{value}</p>
    </div>
  );
}

export function WorkoutDetail({ workout, notice }: { workout: WorkoutDisplay; notice?: string }) {
  return (
    <main className="min-h-screen bg-white text-black">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
          <Link href="/app/workouts" className="text-sm font-medium text-zinc-500 transition hover:text-black">
            ← Back to workouts
          </Link>
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Oracle Conditioning</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight text-black sm:text-5xl">{workout.title}</h1>
            {workout.goal ? <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-600">{workout.goal}</p> : null}
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <MetaCard label="Duration" value={workout.durationMinutes ? `${workout.durationMinutes} min` : "Flexible"} />
            <MetaCard label="Level" value={workout.difficulty ?? "Adaptive"} />
            <MetaCard label="Equipment" value={workout.equipment.length ? workout.equipment.join(", ") : "Bodyweight or as listed"} />
          </div>

          {workout.intakeSummary ? (
            <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">Original request</p>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{workout.intakeSummary}</p>
            </div>
          ) : null}
        </header>

        {notice ? <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">{notice}</div> : null}

        <div className="mt-6 space-y-6">
          {workout.sections.map((section) => (
            <WorkoutSectionBlock key={section.type} section={section} />
          ))}
        </div>
      </div>
    </main>
  );
}
