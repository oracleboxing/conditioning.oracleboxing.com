"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { GeneratedWorkout, WorkoutChatMessage, WorkoutIntake, WorkoutPersistence } from "@/lib/ai/workout-types";

type ApiResponse =
  | {
      type: "question";
      sessionId?: string | null;
      message: string;
      questions: string[];
      intake: WorkoutIntake;
      chatWarnings?: string[];
    }
  | {
      type: "workout";
      sessionId?: string | null;
      message: string;
      intake: WorkoutIntake;
      workout: GeneratedWorkout;
      warnings: string[];
      chatWarnings?: string[];
      persistence: WorkoutPersistence;
    }
  | {
      error: string;
      message: string;
    };

type LoadChatResponse = {
  sessionId: string;
  session: { intake_summary?: WorkoutIntake | null };
  messages: Array<WorkoutChatMessage & { id?: string; created_at?: string | null }>;
  warning?: string;
};

const STARTER_MESSAGE: WorkoutChatMessage = {
  role: "assistant",
  content: "Tell me what you need today. Goal, kit, time, level, injuries and boxing focus if you already know them. I’ll only ask for what’s missing.",
};

function IntakePill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function WorkoutPreview({ workout, persistence, warnings }: { workout: GeneratedWorkout; persistence: WorkoutPersistence; warnings: string[] }) {
  return (
    <section className="rounded-2xl border border-[#007aff]/35 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#7db7ff]">Generated workout</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{workout.title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">{workout.summary}</p>
        </div>
        <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-950">
          {persistence.status === "saved" ? "Saved" : "Preview only"}
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <IntakePill label="Time" value={`${workout.durationMinutes} min`} />
        <IntakePill label="Level" value={workout.difficulty} />
        <IntakePill label="Kit" value={workout.equipment.join(", ") || "bodyweight"} />
      </div>

      <div className="mt-7 space-y-5">
        {workout.blocks.map((block, blockIndex) => (
          <div key={`${block.type}-${blockIndex}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#ff4d4d]">{block.type}</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">{block.title}</h3>
            <div className="mt-4 space-y-3">
              {block.items.map((item, itemIndex) => (
                <div key={`${item.exerciseId}-${itemIndex}`} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-base font-semibold text-slate-950">{item.exercise?.title ?? item.exerciseId}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">{item.coachingNote}</p>
                    </div>
                    <p className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase text-black">
                      {item.sets ? `${item.sets} sets` : item.durationSeconds ? `${item.durationSeconds}s` : "work"}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                    {item.reps && <span className="rounded-full bg-slate-100 px-3 py-1">{item.reps}</span>}
                    {item.restSeconds !== null && <span className="rounded-full bg-slate-100 px-3 py-1">Rest {item.restSeconds}s</span>}
                    {item.tempo && <span className="rounded-full bg-slate-100 px-3 py-1">Tempo {item.tempo}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {(workout.safetyNotes.length > 0 || warnings.length > 0 || persistence.reason) && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
          {[...workout.safetyNotes, ...warnings, persistence.reason].filter(Boolean).map((note) => (
            <p key={note}>• {note}</p>
          ))}
        </div>
      )}

      <p className="mt-5 text-sm font-semibold leading-6 text-slate-500">{workout.progressionNote}</p>
    </section>
  );
}

export default function CreateWorkoutPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WorkoutChatMessage[]>([STARTER_MESSAGE]);
  const [input, setInput] = useState("");
  const [intake, setIntake] = useState<WorkoutIntake | null>(null);
  const [workout, setWorkout] = useState<GeneratedWorkout | null>(null);
  const [persistence, setPersistence] = useState<WorkoutPersistence | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("sessionId");
    if (!id) return;

    let cancelled = false;
    fetch(`/api/chat/workout?sessionId=${encodeURIComponent(id)}`)
      .then(async (response) => {
        const payload = (await response.json()) as LoadChatResponse | { message?: string };
        if (!response.ok) throw new Error("message" in payload && payload.message ? payload.message : "Could not load chat history.");
        return payload as LoadChatResponse;
      })
      .then((payload) => {
        if (cancelled) return;
        setSessionId(payload.sessionId);
        setMessages(payload.messages.length ? payload.messages.map((message) => ({ role: message.role, content: message.content })) : [STARTER_MESSAGE]);
        setIntake(payload.session.intake_summary ?? null);
        if (payload.warning) setError(payload.warning);
      })
      .catch((caught) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not load chat history.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const intakeSummary = useMemo(() => {
    if (!intake) return [];
    return [
      ["Goal", intake.goal],
      ["Kit", intake.equipment.join(", ")],
      ["Time", intake.timeMinutes ? `${intake.timeMinutes} min` : null],
      ["Level", intake.level],
      ["Constraints", intake.injuriesOrConstraints],
      ["Boxing", intake.boxingFocus],
    ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  }, [intake]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();
    if (!content || loading) return;

    const nextMessages: WorkoutChatMessage[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);
    setWorkout(null);

    try {
      const response = await fetch("/api/chat/workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, messages: nextMessages, intake }),
      });
      const payload = (await response.json()) as ApiResponse;

      if (!response.ok || "error" in payload) {
        throw new Error(payload.message ?? "Workout creator failed.");
      }

      setSessionId(payload.sessionId ?? sessionId);
      setIntake(payload.intake);
      setMessages([...nextMessages, { role: "assistant", content: payload.message }]);

      if (payload.type === "workout") {
        setWorkout(payload.workout);
        setPersistence(payload.persistence);
        setWarnings([...(payload.warnings ?? []), ...(payload.chatWarnings ?? [])]);
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Workout creator failed.";
      setError(message);
      setMessages([...nextMessages, { role: "assistant", content: "That hit a snag. Try again or tweak the request." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="text-slate-950">
      <div className="mx-auto grid max-w-none gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#7db7ff]">Oracle Performance Lab</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">AI workout creator</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
                A chat builder for one boxing-specific S&C session. No weekly-plan waffle, just today&apos;s work.
              </p>
            </div>
            <div className="hidden gap-2 sm:flex">
              <Link href="/app/chats" className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-950 hover:bg-slate-100">
                History
              </Link>
              <Link href="/app" className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-950 hover:bg-slate-100">
                Back
              </Link>
            </div>
          </div>

          <div className="mt-6 h-[48vh] min-h-[360px] space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "bg-[#007aff] text-white" : "bg-slate-100 text-slate-900"}`}>
                  {message.content.split("\n").map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>
            ))}
            {loading && <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-500">Building...</div>}
          </div>

          <form onSubmit={handleSubmit} className="mt-4 flex gap-3">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Example: 35 min, dumbbells, intermediate, gas tank, no injuries"
              className="min-w-0 flex-1 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-950 outline-none placeholder:text-slate-500 focus:border-[#007aff]"
            />
            <button
              disabled={loading || !input.trim()}
              className="rounded-full bg-[#007aff] px-5 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-[#2f96ff] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send
            </button>
          </form>
          {sessionId && (
            <p className="mt-3 text-xs font-semibold text-slate-500">
              Saved chat. Resume link: <Link className="text-[#7db7ff] hover:underline" href={`/app/create?sessionId=${sessionId}`}>open this session</Link>
            </p>
          )}
          {error && <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        </section>

        <aside className="space-y-5">
          {intakeSummary.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Current brief</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {intakeSummary.map(([label, value]) => (
                  <IntakePill key={label} label={label} value={value} />
                ))}
              </div>
            </section>
          )}

          {workout && persistence ? (
            <WorkoutPreview workout={workout} persistence={persistence} warnings={warnings} />
          ) : (
            <section className="rounded-2xl border border-slate-200 bg-white p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Output</p>
              <h2 className="mt-3 text-xl font-semibold">Workout lands here</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Once the brief has the essentials, the server searches Supabase exercises, generates a session, validates the exercise IDs, then saves if workout tables exist.
              </p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
