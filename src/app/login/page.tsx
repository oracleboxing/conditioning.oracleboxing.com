import Link from "next/link";
import { signInWithEmail } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{
    message?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/app";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07080a] px-6 py-12 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/40">
        <Link href="/" className="text-sm font-semibold uppercase tracking-[0.25em] text-[#7db7ff]">
          Oracle Conditioning
        </Link>
        <h1 className="mt-6 text-3xl font-black tracking-tight">Sign in</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-300">
          Enter your email and we&apos;ll send a secure magic link. No faffing about with passwords.
        </p>

        <form action={signInWithEmail} className="mt-8 space-y-4">
          <input type="hidden" name="next" value={next} />
          <label className="block text-sm font-semibold text-zinc-200" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none ring-[#007aff] transition placeholder:text-zinc-600 focus:border-[#007aff] focus:ring-2"
          />
          <button
            type="submit"
            className="w-full rounded-2xl bg-[#007aff] px-4 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-[#2f96ff]"
          >
            Send magic link
          </button>
        </form>

        {params.message ? (
          <p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-zinc-200">
            {params.message}
          </p>
        ) : null}
      </div>
    </main>
  );
}
