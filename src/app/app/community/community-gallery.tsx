"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { WorkoutCard } from "@/components/workouts/workout-card";
import type { CommunityWorkout } from "@/lib/community/workouts";

function normalise(value: string) {
  return value.toLowerCase().trim();
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "O";
}

function postDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", timeZone: "UTC" }).format(date);
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"}>
      <path d="M7 4.75A1.75 1.75 0 0 1 8.75 3h6.5A1.75 1.75 0 0 1 17 4.75v15l-5-3.1-5 3.1v-15Z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SaveBookmarkButton({ workout }: { workout: CommunityWorkout }) {
  const router = useRouter();
  const [saved, setSaved] = useState(workout.isSavedByCurrentUser);
  const [pending, setPending] = useState(false);

  if (workout.isOwnWorkout) return null;

  async function toggleSave() {
    setPending(true);
    try {
      const response = await fetch(`/api/workouts/${workout.id}/save`, { method: saved ? "DELETE" : "POST" });
      const payload = (await response.json()) as { saved?: boolean };
      if (!response.ok) throw new Error("Save toggle failed");
      setSaved(Boolean(payload.saved));
      router.refresh();
    } catch {
      setSaved(workout.isSavedByCurrentUser);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      aria-label={saved ? "Remove workout" : "Save workout"}
      title={saved ? "Remove workout" : "Save workout"}
      disabled={pending}
      onClick={() => void toggleSave()}
      className={`grid h-8 w-8 place-items-center transition ${saved ? "text-slate-950" : "text-slate-400 hover:text-slate-950"} disabled:cursor-wait disabled:opacity-60`}
    >
      <BookmarkIcon filled={saved || pending} />
    </button>
  );
}

function AuthorAvatar({ workout }: { workout: CommunityWorkout }) {
  if (workout.builderAvatarUrl) {
    return (
      <div style={{ width: 40, height: 40, minWidth: 40, maxWidth: 40, overflow: "hidden", borderRadius: 9999, background: "#f1f5f9" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={workout.builderAvatarUrl} alt="" style={{ width: 40, height: 40, minWidth: 40, maxWidth: 40, objectFit: "cover", display: "block" }} />
      </div>
    );
  }

  return <div style={{ width: 40, height: 40, minWidth: 40, maxWidth: 40 }} className="grid shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">{initials(workout.builderName)}</div>;
}

function WorkoutPost({ workout }: { workout: CommunityWorkout }) {
  return (
    <article className="min-w-0 max-w-full space-y-4 overflow-x-hidden pb-8">
      <div className="flex items-center gap-3">
        <AuthorAvatar workout={workout} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-950">{workout.builderName}</p>
          <p className="text-xs text-slate-500">shared a workout · {postDate(workout.createdAt)}{workout.savedCount > 0 ? ` · ${workout.savedCount} save${workout.savedCount === 1 ? "" : "s"}` : ""}</p>
        </div>
        <SaveBookmarkButton workout={workout} />
      </div>

      <div className="min-w-0 max-w-full overflow-hidden rounded-3xl">
        <WorkoutCard
          id={workout.id}
          title={workout.title}
          imageUrl={workout.imageUrl}
          durationMinutes={workout.durationMinutes}
          difficulty={workout.difficulty}
          equipment={workout.equipment}
        />
      </div>
    </article>
  );
}

type SortMode = "recent" | "saves";

function compareByRecent(a: CommunityWorkout, b: CommunityWorkout) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function compareBySaves(a: CommunityWorkout, b: CommunityWorkout) {
  return (b.savedCount ?? 0) - (a.savedCount ?? 0) || compareByRecent(a, b);
}

export function CommunityGallery({ workouts }: { workouts: CommunityWorkout[] }) {
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("recent");

  const filteredWorkouts = useMemo(() => {
    const query = normalise(search);
    const visible = query ? workouts.filter((workout) => normalise([workout.title, workout.builderName, workout.equipment.join(" ")].join(" ")).includes(query)) : workouts;
    return [...visible].sort(sortMode === "saves" ? compareBySaves : compareByRecent);
  }, [search, sortMode, workouts]);

  return (
    <div className="min-w-0 max-w-full space-y-4 overflow-x-hidden">
      <input
        value={search}
        onChange={(event) => startTransition(() => setSearch(event.target.value))}
        placeholder="Search team workouts"
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-slate-400"
      />

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setSortMode((current) => current === "recent" ? "saves" : "recent")}
          className="px-0 py-1 text-xs font-bold text-slate-950 underline-offset-4 transition hover:underline"
        >
          Sort by: {sortMode === "recent" ? "Recent" : "Saves"}
        </button>
        {isPending ? <p className="text-xs font-medium text-slate-400">Searching</p> : null}
      </div>

      {filteredWorkouts.length ? (
        <section className="grid min-w-0 max-w-full gap-8 overflow-x-hidden">
          {filteredWorkouts.map((workout) => <WorkoutPost key={workout.id} workout={workout} />)}
        </section>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No team workouts found.</div>
      )}
    </div>
  );
}
