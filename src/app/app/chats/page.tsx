import Link from "next/link";
import { listChatSessions } from "@/lib/ai/chat-history";
import { createAuthClient } from "@/lib/supabase/auth-server";
import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type IntakeSummary = {
  goal?: string | null;
  equipment?: string[] | null;
  timeMinutes?: number | null;
  level?: string | null;
  boxingFocus?: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "Not dated";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function intakeLine(value: unknown) {
  const intake = value as IntakeSummary | null;
  if (!intake || typeof intake !== "object") return "No brief captured yet.";
  return [intake.goal, intake.timeMinutes ? `${intake.timeMinutes} min` : null, intake.level, intake.boxingFocus, intake.equipment?.length ? intake.equipment.join(", ") : null]
    .filter(Boolean)
    .join(" · ") || "No brief captured yet.";
}

export default async function ChatsPage() {
  const supabase = (await createAuthClient()) as SupabaseClient<Database>;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { sessions, warning } = user ? await listChatSessions(supabase, user.id, 40) : { sessions: [], warning: undefined };

  return (
    <main className="min-h-screen bg-[#07080a] px-4 py-6 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#7db7ff]">Oracle Performance Lab</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">Workout chat history</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">Resume a saved AI workout creator thread without starting from scratch.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/app/create" className="rounded-full bg-[#007aff] px-5 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-[#2f96ff]">
              New chat
            </Link>
            <Link href="/app" className="rounded-full border border-white/15 px-5 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-white/10">
              Back
            </Link>
          </div>
        </header>

        {warning && <p className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-50">{warning}</p>}

        <section className="mt-8 space-y-3">
          {sessions.length ? (
            sessions.map((session) => (
              <Link key={session.id} href={`/app/create?sessionId=${session.id}`} className="block rounded-3xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-[#007aff]/60 hover:bg-white/[0.07]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xl font-black text-white">{session.title || "Workout chat"}</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-300">{intakeLine(session.intake_summary)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                    <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-black uppercase tracking-wide text-zinc-200">{session.status}</span>
                    <span className="text-xs font-semibold text-zinc-500">{formatDate(session.updated_at ?? session.created_at)}</span>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7">
              <h2 className="text-2xl font-black">No saved chats yet</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-300">Start a creator chat and it will appear here once the chat history SQL is applied.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
