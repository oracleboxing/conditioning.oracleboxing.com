import Link from "next/link";
import { redirect } from "next/navigation";
import { hasPremiumAccess } from "@/lib/auth/access";
import { createAuthClient } from "@/lib/supabase/auth-server";
import { signOut } from "./actions";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{
    state?: "sent" | "error" | "denied";
    message?: string;
    next?: string;
    email?: string;
  }>;
};

function safeNext(value?: string) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/app";
}

function Notice({ state, message, email }: { state?: string; message?: string; email?: string }) {
  if (state === "sent") {
    return (
      <div className="mt-6 rounded-3xl border border-[#B8FF3D]/30 bg-[#B8FF3D]/10 p-5">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#B8FF3D]">Magic link sent</p>
        <p className="mt-2 text-sm leading-6 text-slate-200">
          Check {email ? <span className="font-bold text-white">{email}</span> : "your inbox"}. The link signs you in and sends you straight to the app.
        </p>
      </div>
    );
  }

  if (state === "error" || message) {
    return (
      <div className="mt-6 rounded-3xl border border-red-400/30 bg-red-500/10 p-5">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-red-200">Could not send link</p>
        <p className="mt-2 text-sm leading-6 text-red-100">{message ?? "Try again in a minute."}</p>
      </div>
    );
  }

  return null;
}

function AccessDenied({ email }: { email?: string }) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#05070A] px-5 py-8 text-white sm:px-8">
      <div className="absolute inset-0 -z-0 bg-[radial-gradient(circle_at_top_right,rgba(0,122,255,0.28),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(184,255,61,0.10),transparent_34%)]" />
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <div className="w-full max-w-2xl rounded-[2.25rem] border border-white/10 bg-[#0B111A]/90 p-6 shadow-2xl shadow-black/50 backdrop-blur sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#B8FF3D]">Premium gate</p>
          <h1 className="mt-5 text-4xl font-black leading-none tracking-[-0.05em] sm:text-6xl">This account is signed in, but not unlocked.</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
            {email ? <><span className="font-bold text-white">{email}</span> is authenticated, </> : "You are authenticated, "}
            but it is not on the premium allowlist and does not have active member access yet.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <form action={signOut}>
              <button className="w-full rounded-full bg-white px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-black transition hover:bg-slate-200">
                Sign out
              </button>
            </form>
            <Link
              href="/"
              className="rounded-full border border-white/15 px-5 py-4 text-center text-sm font-black uppercase tracking-[0.16em] text-white transition hover:bg-white/10"
            >
              Back to landing
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const premium = await hasPremiumAccess(supabase, user);

    if (premium) {
      redirect(next);
    }

    return <AccessDenied email={user.email ?? undefined} />;
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#05070A] px-5 py-8 text-white sm:px-8">
      <div className="absolute inset-0 -z-0 bg-[radial-gradient(circle_at_top_right,rgba(0,122,255,0.30),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(184,255,61,0.12),transparent_32%)]" />
      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="hidden lg:block">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#B8FF3D]">Oracle Performance Lab</p>
          <h1 className="mt-5 max-w-3xl text-7xl font-black leading-[0.9] tracking-[-0.065em]">
            Built for boxers who train like the engine matters.
          </h1>
          <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
            {["Private MVP", "Magic link", "Premium only"].map((label) => (
              <div key={label} className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Access</p>
                <p className="mt-2 text-lg font-black text-white">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full rounded-[2.25rem] border border-white/10 bg-[#0B111A]/90 p-6 shadow-2xl shadow-black/50 backdrop-blur sm:p-8">
          <Link href="/" className="text-xs font-black uppercase tracking-[0.24em] text-[#7db7ff]">
            Oracle Conditioning
          </Link>
          <h2 className="mt-6 text-4xl font-black leading-none tracking-[-0.05em] sm:text-5xl">Sign in to the lab.</h2>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            Use the email tied to your premium access. We&apos;ll send a secure Supabase magic link, no password circus.
          </p>

          <LoginForm next={next} />
          <Notice state={params.state} message={params.message} email={params.email} />

          <div className="mt-6 rounded-3xl border border-white/10 bg-black/25 p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">After sign-in</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Allowed accounts go to <span className="font-mono text-white">/app</span>. Everyone else sees the premium access screen and can sign out cleanly.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
