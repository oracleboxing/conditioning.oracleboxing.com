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
    <div className="text-slate-950">
      <div className="mx-auto max-w-none">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#7db7ff]">Oracle Performance Lab</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Workout chat history</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Resume a saved AI workout creator thread without starting from scratch.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/app/create" className="rounded-full bg-[#007aff] px-5 py-3 text-sm font-semibold uppercase tracking-wide text-white hover:bg-[#2f96ff]">
              New chat
            </Link>
            <Link href="/app" className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-slate-950 hover:bg-slate-100">
              Back
            </Link>
          </div>
        </header>

        {warning && <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{warning}</p>}

        <section className="mt-8 space-y-3">
          {sessions.length ? (
            sessions.map((session) => (
              <Link key={session.id} href={`/app/create?sessionId=${session.id}`} className="block rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-[#007aff]/60 hover:bg-slate-100">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xl font-semibold text-slate-950">{session.title || "Workout chat"}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{intakeLine(session.intake_summary)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">{session.status}</span>
                    <span className="text-xs font-semibold text-slate-500">{formatDate(session.updated_at ?? session.created_at)}</span>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-7">
              <h2 className="text-xl font-semibold">No saved chats yet</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">Start a creator chat and it will appear here once the chat history SQL is applied.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
