import Link from "next/link";
import { redirect } from "next/navigation";
import { hasPremiumAccess } from "@/lib/auth/access";
import { createAuthClient } from "@/lib/supabase/auth-server";
import { signOut } from "../login/actions";

export const dynamic = "force-dynamic";

const navItems = [
  { href: "/app/create", label: "Create" },
  { href: "/app/workouts", label: "Workouts" },
  { href: "/app/chats", label: "Chats" },
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

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/app" className="text-sm font-semibold text-slate-950">Oracle Conditioning</Link>
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
      <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
    </main>
  );
}
