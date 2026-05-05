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
      <section className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(0,122,255,0.28),transparent_38%),#0b111a] p-5 shadow-2xl shadow-black/40 sm:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#b8ff3d]">Oracle Conditioning</p>
            <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[0.9] tracking-[-0.06em] sm:text-7xl">
              Build the engine behind the boxing.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg">
              Create focused S&amp;C sessions, save the full workout, resume the AI chat that made it, and pull ideas from the community without turning training into spreadsheet cosplay.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/app/create" className="rounded-full bg-[#007aff] px-6 py-4 text-center text-sm font-black uppercase tracking-[0.18em] text-white shadow-2xl shadow-[#007aff]/25 transition hover:bg-[#2f96ff]">
                Create workout
              </Link>
              <Link href="/app/chats" className="rounded-full border border-white/15 bg-white/[0.04] px-6 py-4 text-center text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-white/10">
                Chat history
              </Link>
              <Link href="/app/workouts" className="rounded-full border border-white/15 bg-white/[0.04] px-6 py-4 text-center text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-white/10">
                My workouts
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-black/25 p-5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#7db7ff]">Lab status</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-3xl bg-white/[0.06] p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Access</p>
                <p className="mt-2 text-xl font-black text-white">Premium unlocked</p>
              </div>
              <div className="rounded-3xl bg-white/[0.06] p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Signed in</p>
                <p className="mt-2 truncate text-sm font-semibold text-zinc-200">{user?.email}</p>
              </div>
              <div className="rounded-3xl bg-white/[0.06] p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Saved sessions</p>
                <p className="mt-2 font-mono text-3xl font-black text-[#b8ff3d]">{saved.workouts.length}</p>
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
            className={`rounded-[2rem] border p-5 transition sm:p-6 ${
              action.primary
                ? "border-[#007aff]/40 bg-[#007aff]/10 hover:border-[#007aff] hover:bg-[#007aff]/15"
                : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]"
            }`}
          >
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#7db7ff]">{action.eyebrow}</p>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-white">{action.title}</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">{action.copy}</p>
            <p className="mt-5 text-sm font-black uppercase tracking-[0.16em] text-white">{action.cta} →</p>
          </Link>
        ))}
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-zinc-500">Recent saves</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Pick up where you left off.</h2>
          </div>
          <Link href="/app/workouts" className="rounded-full border border-white/15 px-5 py-3 text-center text-xs font-black uppercase tracking-wide text-white transition hover:bg-white/10">
            View all
          </Link>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {recent.map((workout) => (
            <Link key={workout.id} href={`/workouts/${workout.id}`} className="rounded-3xl border border-white/10 bg-black/25 p-4 transition hover:border-[#007aff]/50 hover:bg-[#007aff]/10">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-zinc-300">{workout.visibility}</span>
                <span className="text-xs font-semibold text-zinc-500">{formatDate(workout.createdAt)}</span>
              </div>
              <h3 className="mt-4 text-xl font-black leading-tight text-white">{workout.title}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{workout.goal ?? "Saved Oracle Performance Lab session."}</p>
            </Link>
          ))}
        </div>
        {saved.note ? <p className="mt-4 text-sm text-zinc-500">{saved.note}</p> : null}
      </section>
    </div>
  );
}
