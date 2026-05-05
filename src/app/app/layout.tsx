import Link from "next/link";
import { redirect } from "next/navigation";
import { hasPremiumAccess } from "@/lib/auth/access";
import { createAuthClient } from "@/lib/supabase/auth-server";
import { signOut } from "../login/actions";

export const dynamic = "force-dynamic";

const navItems = [
  { href: "/app/create", label: "Create Workout", description: "Build today's session" },
  { href: "/app/workouts", label: "My Workouts", description: "Saved training" },
  { href: "/app/community", label: "Community", description: "Borrow proven sessions" },
];

function PremiumRequired({ email }: { email?: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07080a] px-6 py-12 text-white">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/40">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#7db7ff]">Oracle Performance Lab</p>
        <h1 className="mt-6 text-3xl font-black tracking-tight">Premium access required</h1>
        <p className="mt-4 text-sm leading-6 text-zinc-300">
          You&apos;re signed in{email ? ` as ${email}` : ""}, but this account is not on the premium allowlist and does not have active member access yet.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <form action={signOut}>
            <button className="w-full rounded-full bg-white px-5 py-3 text-sm font-bold uppercase tracking-wide text-black transition hover:bg-zinc-200 sm:w-auto">
              Sign out
            </button>
          </form>
          <Link
            href="/"
            className="rounded-full border border-white/15 px-5 py-3 text-center text-sm font-bold uppercase tracking-wide text-white transition hover:bg-white/10"
          >
            Back home
          </Link>
        </div>
      </div>
    </main>
  );
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/app");
  }

  const premium = await hasPremiumAccess(supabase, user);

  if (!premium) {
    return <PremiumRequired email={user.email ?? undefined} />;
  }

  return (
    <main className="min-h-screen bg-[#05070a] text-white">
      <div className="absolute inset-x-0 top-0 -z-0 h-80 bg-[radial-gradient(circle_at_top_right,rgba(0,122,255,0.24),transparent_35%),radial-gradient(circle_at_top_left,rgba(184,255,61,0.08),transparent_30%)]" />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <header className="sticky top-3 z-30 rounded-[2rem] border border-white/10 bg-[#0b111a]/90 p-3 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-between gap-4">
              <Link href="/app" className="group min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#b8ff3d]">Oracle</p>
                <p className="mt-1 text-xl font-black leading-none tracking-[-0.04em] text-white sm:text-2xl">Performance Lab</p>
              </Link>
              <form action={signOut} className="lg:hidden">
                <button className="rounded-full border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-white/10">
                  Sign out
                </button>
              </form>
            </div>

            <nav aria-label="App navigation" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:pb-0">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="min-w-[10rem] rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 transition hover:border-[#007aff]/60 hover:bg-[#007aff]/10 lg:min-w-0"
                >
                  <span className="block text-sm font-black text-white">{item.label}</span>
                  <span className="mt-1 block text-xs text-zinc-500">{item.description}</span>
                </Link>
              ))}
            </nav>

            <div className="hidden items-center gap-3 lg:flex">
              <div className="max-w-48 truncate text-right text-xs text-zinc-500">
                <span className="block font-black uppercase tracking-[0.18em] text-zinc-600">Signed in</span>
                {user.email}
              </div>
              <form action={signOut}>
                <button className="rounded-full border border-white/15 px-5 py-3 text-xs font-black uppercase tracking-wide text-white transition hover:bg-white/10">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>

        <div className="flex-1 py-6 sm:py-8">{children}</div>
      </div>
    </main>
  );
}
