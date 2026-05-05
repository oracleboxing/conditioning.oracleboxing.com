"use client";

import { useFormStatus } from "react-dom";
import { signInWithEmail } from "./actions";

type LoginFormProps = {
  next: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="group relative w-full overflow-hidden rounded-2xl bg-[#007aff] px-4 py-4 text-sm font-black uppercase tracking-[0.18em] text-white shadow-2xl shadow-[#007aff]/20 transition hover:bg-[#2f96ff] disabled:cursor-wait disabled:bg-[#1f5f9f]"
    >
      <span className="relative z-10">{pending ? "Sending secure link" : "Send magic link"}</span>
      <span className="absolute inset-y-0 left-0 w-1/3 -translate-x-full bg-white/20 blur-xl transition group-hover:translate-x-[350%]" />
    </button>
  );
}

export function LoginForm({ next }: LoginFormProps) {
  return (
    <form action={signInWithEmail} className="mt-8 space-y-5">
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="block text-xs font-black uppercase tracking-[0.18em] text-slate-300" htmlFor="email">
          Member email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="mt-3 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-base text-white outline-none ring-[#007aff] transition placeholder:text-slate-600 focus:border-[#007aff] focus:ring-2"
        />
      </div>
      <SubmitButton />
    </form>
  );
}
