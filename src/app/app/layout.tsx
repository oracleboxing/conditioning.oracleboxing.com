import Link from "next/link";
import { redirect } from "next/navigation";
import { hasPremiumAccess } from "@/lib/auth/access";
import { createAuthClient } from "@/lib/supabase/auth-server";
import { signOut } from "../login/actions";

export const dynamic = "force-dynamic";

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
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07080a] px-6 py-12 text-white">
        <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/40">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#7db7ff]">Oracle Conditioning</p>
          <h1 className="mt-6 text-3xl font-black tracking-tight">Premium access required</h1>
          <p className="mt-4 text-sm leading-6 text-zinc-300">
            You&apos;re signed in as {user.email}, but this account is not on the premium allowlist and does not have active member access yet.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <form action={signOut}>
              <button className="rounded-full bg-white px-5 py-3 text-sm font-bold uppercase tracking-wide text-black transition hover:bg-zinc-200">
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

  return <>{children}</>;
}
