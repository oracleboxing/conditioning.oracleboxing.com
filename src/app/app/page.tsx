import Link from "next/link";
import { createAuthClient } from "@/lib/supabase/auth-server";
import { signOut } from "../login/actions";

export const dynamic = "force-dynamic";

export default async function AppHome() {
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-[#07080a] px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#7db7ff]">Oracle Conditioning</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">My Workouts</h1>
            <p className="mt-2 text-sm text-zinc-400">Signed in as {user?.email}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href="/app/create"
              className="rounded-full bg-[#007aff] px-5 py-3 text-center text-sm font-bold uppercase tracking-wide text-white transition hover:bg-[#2f96ff]"
            >
              Create workout
            </a>
            <a
              href="/app/chats"
              className="rounded-full border border-white/15 px-5 py-3 text-center text-sm font-bold uppercase tracking-wide text-white transition hover:bg-white/10"
            >
              Chat history
            </a>
            <form action={signOut}>
              <button className="rounded-full border border-white/15 px-5 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-white/10">
                Sign out
              </button>
            </form>
          </div>
        </header>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:col-span-2">
            <h2 className="text-2xl font-black tracking-tight">AI workout creator is live</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
              Build one boxing-specific S&amp;C workout from a short chat brief. It searches the Supabase exercise library, validates the chosen exercises, and saves when workout tables are available.
            </p>
          </div>
          <Link href="/app/community" className="rounded-3xl border border-[#007aff]/30 bg-[#007aff]/10 p-6 transition hover:border-[#007aff] hover:bg-[#007aff]/15">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#7db7ff]">Community</p>
            <p className="mt-3 text-2xl font-black">Browse the gallery</p>
            <p className="mt-2 text-sm leading-6 text-zinc-300">Shared member workouts with filters for goal, kit, duration and difficulty.</p>
          </Link>
        </section>
      </div>
    </main>
  );
}
