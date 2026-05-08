import Image from "next/image";
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
      <div className="mx-auto mt-6 max-w-xs rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-center">
        <p className="text-sm leading-6 text-slate-600">
          Magic link sent to {email ? <span className="font-semibold text-slate-950">{email}</span> : "your inbox"}.
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
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-8 text-slate-950">
      <section className="w-full max-w-sm rounded-[2rem] border border-zinc-200 bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
        <Link href="/" aria-label="Oracle Conditioning home" className="mx-auto block w-fit">
          <Image src="https://sb.oracleboxing.com/logo/long_dark.webp" alt="Oracle Boxing" width={240} height={54} priority unoptimized className="h-auto w-52" />
        </Link>
        <h1 className="mt-10 text-center text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mx-auto mt-3 max-w-xs text-center text-sm leading-6 text-slate-500">Enter your email and we&apos;ll send you a magic link.</p>

        <LoginForm next={next} />
        <Notice state={params.state} message={params.message} email={params.email} />
      </section>
    </main>
  );
}
