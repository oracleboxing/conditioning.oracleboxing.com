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
      className="w-full rounded-full bg-[#007aff] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#2f96ff] disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? "Sending link..." : "Send magic link"}
    </button>
  );
}

export function LoginForm({ next }: LoginFormProps) {
  return (
    <form action={signInWithEmail} className="mx-auto mt-8 w-full max-w-xs space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="mt-2 w-full rounded-full border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-950 outline-none ring-[#007aff] transition placeholder:text-slate-400 focus:border-[#007aff] focus:ring-2"
        />
      </div>
      <SubmitButton />
    </form>
  );
}
