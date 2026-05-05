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
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-8 text-slate-950">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#7db7ff]">Oracle Performance Lab</p>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Premium access required</h1>
        <p className="mt-4 text-sm leading-6 text-slate-500">
          You&apos;re signed in{email ? ` as ${email}` : ""}, but this account is not on the premium allowlist and does not have active member access yet.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <form action={signOut}>
            <button className="w-full rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-bold uppercase tracking-wide text-slate-950 transition hover:bg-slate-100 sm:w-auto">
              Sign out
            </button>
          </form>
          <Link
            href="/"
            className="rounded-full border border-slate-300 px-5 py-3 text-center text-sm font-bold uppercase tracking-wide text-slate-950 transition hover:bg-slate-100"
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
    <main className="min-h-screen bg-white text-slate-950">
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-none flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <header className="sticky top-3 z-30 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm backdrop-blur-xl sm:p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-between gap-4">
              <Link href="/app" className="group min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#007aff]">Oracle</p>
                <p className="mt-1 text-xl font-semibold leading-none tracking-[-0.04em] text-slate-950 sm:text-2xl">Performance Lab</p>
              </Link>
              <form action={signOut} className="lg:hidden">
                <button className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-950 transition hover:bg-slate-100">
                  Sign out
                </button>
              </form>
            </div>

            <nav aria-label="App navigation" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:pb-0">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="min-w-[10rem] rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-[#007aff]/60 hover:bg-[#007aff]/10 lg:min-w-0"
                >
                  <span className="block text-sm font-semibold text-slate-950">{item.label}</span>
                  <span className="mt-1 block text-xs text-slate-500">{item.description}</span>
                </Link>
              ))}
            </nav>

            <div className="hidden items-center gap-3 lg:flex">
              <div className="max-w-48 truncate text-right text-xs text-slate-500">
                <span className="block font-semibold uppercase tracking-[0.12em] text-slate-500">Signed in</span>
                {user.email}
              </div>
              <form action={signOut}>
                <button className="rounded-full border border-slate-300 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-950 transition hover:bg-slate-100">
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
