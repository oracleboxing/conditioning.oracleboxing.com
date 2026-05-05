import Link from "next/link";
import { redirect } from "next/navigation";
import { hasPremiumAccess } from "@/lib/auth/access";
import { listChatSessions } from "@/lib/ai/chat-history";
import { createAuthClient } from "@/lib/supabase/auth-server";
import { signOut } from "../login/actions";

export const dynamic = "force-dynamic";

const navItems = [
  { href: "/app/create", label: "Create" },
  { href: "/app/workouts", label: "Workouts" },
  { href: "/app/community", label: "Community" },
];

function PremiumRequired({ email }: { email?: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-8 text-slate-950">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">Premium access required</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          {email ? `${email} is signed in, but does not have access yet.` : "This account does not have access yet."}
        </p>
        <form action={signOut} className="mt-6">
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-50">
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/app");

  const premium = await hasPremiumAccess(supabase, user);
  if (!premium) return <PremiumRequired email={user.email ?? undefined} />;

  const { sessions } = await listChatSessions(supabase, user.id, 20);

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/app" aria-label="Oracle Boxing" className="block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://sb.oracleboxing.com/logo/long_dark.webp" alt="Oracle Boxing" className="h-7 w-auto" />
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-950">
                {item.label}
              </Link>
            ))}
          </nav>
          <form action={signOut}>
            <button className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-950">Sign out</button>
          </form>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-3 py-2 sm:hidden">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="shrink-0 rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-950">
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <div className="flex">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-72 shrink-0 border-r border-slate-200 bg-white px-3 py-4 lg:block">
          <div className="flex items-center justify-between px-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">History</p>
            <Link href="/app/create" className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100">New</Link>
          </div>
          <div className="mt-4 space-y-1 overflow-y-auto">
            {sessions.length ? sessions.map((session) => (
              <Link key={session.id} href={`/app/create?sessionId=${session.id}`} className="block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-950">
                <span className="block truncate">{session.title || "Workout"}</span>
              </Link>
            )) : (
              <p className="px-3 py-2 text-sm text-slate-400">No workouts yet.</p>
            )}
          </div>
        </aside>
        <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </div>
    </main>
  );
}
