import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/auth-server";
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

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(next);
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
