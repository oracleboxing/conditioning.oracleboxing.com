import Link from "next/link";
import { createAuthClient } from "@/lib/supabase/auth-server";
import { getSavedWorkouts } from "@/lib/workouts/data";

export const dynamic = "force-dynamic";

const nextActions = [
  {
    href: "/app/create",
    eyebrow: "Build",
    title: "Create today's workout",
    copy: "Give the lab your goal, kit, time and constraints. It turns that into one usable boxing-specific conditioning session.",
    cta: "Start builder",
    primary: true,
  },
  {
    href: "/app/chats",
    eyebrow: "History",
    title: "Resume chat history",
    copy: "Pick up the exact AI conversation that created a session instead of starting from scratch every time.",
    cta: "Open chats",
  },
  {
    href: "/app/workouts",
    eyebrow: "Library",
    title: "Review saved workouts",
    copy: "Check previous sessions, duration and kit, then open the full plan when you are ready to train.",
    cta: "My workouts",
  },
  {
    href: "/app/community",
    eyebrow: "Community",
    title: "Steal what works",
    copy: "Browse shared member sessions and use the gallery as a shortcut when your brain is mush. Happens to the best of us.",
    cta: "Open gallery",
  },
];

function formatDate(value: string | null) {
  if (!value) return "Draft";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(new Date(value));
}

export default async function AppHome() {
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const saved = await getSavedWorkouts(user?.id);
  const recent = saved.workouts.slice(0, 3);

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 lg:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#007aff]">Oracle Conditioning</p>
            <h1 className="mt-5 max-w-4xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Build the engine behind the boxing.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-500 sm:text-lg">
              Create focused S&amp;C sessions, save the full workout, resume the AI chat that made it, and pull ideas from the community without turning training into spreadsheet cosplay.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/app/create" className="rounded-full bg-[#007aff] px-6 py-4 text-center text-sm font-semibold uppercase tracking-[0.12em] text-white shadow-sm transition hover:bg-[#2f96ff]">
                Create workout
              </Link>
              <Link href="/app/chats" className="rounded-full border border-slate-300 bg-white px-6 py-4 text-center text-sm font-semibold uppercase tracking-[0.12em] text-slate-950 transition hover:bg-slate-100">
                Chat history
              </Link>
              <Link href="/app/workouts" className="rounded-full border border-slate-300 bg-white px-6 py-4 text-center text-sm font-semibold uppercase tracking-[0.12em] text-slate-950 transition hover:bg-slate-100">
                My workouts
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7db7ff]">Lab status</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Access</p>
                <p className="mt-2 text-xl font-semibold text-slate-950">Premium unlocked</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Signed in</p>
                <p className="mt-2 truncate text-sm font-semibold text-slate-700">{user?.email}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Saved sessions</p>
                <p className="mt-2 font-mono text-2xl font-semibold text-[#007aff]">{saved.workouts.length}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        {nextActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={`rounded-2xl border p-5 transition sm:p-6 ${
              action.primary
                ? "border-[#007aff]/40 bg-[#007aff]/10 hover:border-[#007aff] hover:bg-[#007aff]/15"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-100"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7db7ff]">{action.eyebrow}</p>
            <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">{action.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">{action.copy}</p>
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.1em] text-slate-950">{action.cta} →</p>
          </Link>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Recent saves</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Pick up where you left off.</h2>
          </div>
          <Link href="/app/workouts" className="rounded-full border border-slate-300 px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-950 transition hover:bg-slate-100">
            View all
          </Link>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {recent.map((workout) => (
            <Link key={workout.id} href={`/workouts/${workout.id}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-[#007aff]/50 hover:bg-[#007aff]/10">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{workout.visibility}</span>
                <span className="text-xs font-semibold text-slate-500">{formatDate(workout.createdAt)}</span>
              </div>
              <h3 className="mt-4 text-xl font-semibold leading-tight text-slate-950">{workout.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-500">{workout.goal ?? "Saved Oracle Performance Lab session."}</p>
            </Link>
          ))}
        </div>
        {saved.note ? <p className="mt-4 text-sm text-slate-500">{saved.note}</p> : null}
      </section>
    </div>
  );
}
