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
      <div className="mt-6 rounded-2xl border border-[#007aff]/30 bg-[#007aff]/10 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#007aff]">Magic link sent</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Check {email ? <span className="font-bold text-slate-950">{email}</span> : "your inbox"}. The link signs you in and sends you straight to the app.
        </p>
      </div>
    );
  }

  if (state === "error" || message) {
    return (
      <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-red-700">Could not send link</p>
        <p className="mt-2 text-sm leading-6 text-red-700">{message ?? "Try again in a minute."}</p>
      </div>
    );
  }

  return null;
}

function AccessDenied({ email }: { email?: string }) {
  return (
    <main className="min-h-screen overflow-hidden bg-white px-5 py-8 text-slate-950 sm:px-8">
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-none items-center justify-center">
        <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm backdrop-blur sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#007aff]">Premium gate</p>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">This account is signed in, but not unlocked.</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-500">
            {email ? <><span className="font-bold text-slate-950">{email}</span> is authenticated, </> : "You are authenticated, "}
            but it is not on the premium allowlist and does not have active member access yet.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <form action={signOut}>
              <button className="w-full rounded-full border border-slate-300 bg-white px-5 py-4 text-sm font-semibold uppercase tracking-[0.1em] text-slate-950 transition hover:bg-slate-100">
                Sign out
              </button>
            </form>
            <Link
              href="/"
              className="rounded-full border border-slate-300 px-5 py-4 text-center text-sm font-semibold uppercase tracking-[0.1em] text-slate-950 transition hover:bg-slate-100"
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
    <main className="min-h-screen overflow-hidden bg-white px-5 py-8 text-slate-950 sm:px-8">
      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-4rem)] max-w-none items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="hidden lg:block">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#007aff]">Oracle Performance Lab</p>
          <h1 className="mt-5 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Built for boxers who train like the engine matters.
          </h1>
          <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
            {["Private MVP", "Magic link", "Premium only"].map((label) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Access</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm backdrop-blur sm:p-8">
          <Link href="/" className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7db7ff]">
            Oracle Conditioning
          </Link>
          <h2 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">Sign in to the lab.</h2>
          <p className="mt-4 text-sm leading-6 text-slate-500">
            Use the email tied to your premium access. We&apos;ll send a secure Supabase magic link, no password circus.
          </p>

          <LoginForm next={next} />
          <Notice state={params.state} message={params.message} email={params.email} />

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">After sign-in</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Allowed accounts go to <span className="font-mono text-slate-950">/app</span>. Everyone else sees the premium access screen and can sign out cleanly.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
