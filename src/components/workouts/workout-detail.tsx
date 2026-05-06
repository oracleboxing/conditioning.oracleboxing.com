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

function ExerciseImage({ item }: { item: WorkoutItem }) {
  const images = item.exercise.imageUrls.length ? item.exercise.imageUrls.slice(0, 2) : item.exercise.imageUrl ? [item.exercise.imageUrl] : [];

  if (!images.length) {
    return (
      <div className="flex h-56 items-center justify-center rounded-t-2xl border border-b-0 border-dashed border-zinc-300 bg-zinc-50 text-center text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
        Exercise image
      </div>
    );
  }

  return (
    <div className="flex overflow-hidden rounded-t-2xl border border-b-0 border-zinc-200 bg-zinc-100">
      {images.map((image, imageIndex) => (
        <Image
          key={image}
          src={image}
          alt={`${item.exercise.name} image ${imageIndex + 1}`}
          width={720}
          height={540}
          unoptimized
          className={`h-56 min-w-0 flex-1 object-cover sm:h-64 lg:h-72 ${images.length > 1 && imageIndex > 0 ? "border-l border-zinc-200" : ""}`}
        />
      ))}
    </div>
  );
}

function ExerciseCard({ item }: { item: WorkoutItem }) {
  const { firstInstructions } = detailCopy(item);
  const howTo = firstInstructions.length ? firstInstructions : item.coachingNote ? [item.coachingNote] : [];

  return (
    <article className="border-t border-zinc-100 py-6 first:border-t-0">
      <ExerciseImage item={item} />
      <div className="grid gap-4 border border-zinc-200 bg-white p-4 sm:grid-cols-[1fr_190px] sm:p-5">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold tracking-tight text-black sm:text-xl">{item.exercise.name}</h3>
          {howTo.length ? (
            <div className="mt-2 space-y-1.5 text-sm leading-6 text-zinc-600">
              {howTo.map((instruction, index) => (
                <p key={`${item.id}-how-${index}`}>{instruction}</p>
              ))}
            </div>
          ) : null}
        </div>
        <p className="text-left text-base font-semibold leading-6 text-black sm:text-right sm:text-lg">
          {prescription(item)}
        </p>
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
