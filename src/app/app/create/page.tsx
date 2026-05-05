"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { GeneratedWorkout, WorkoutChatMessage, WorkoutIntake, WorkoutPersistence } from "@/lib/ai/workout-types";

type StreamEvent =
  | { type: "session"; sessionId: string; warnings: string[] }
  | { type: "intake"; intake: WorkoutIntake }
  | { type: "question"; message: string; questions: string[] }
  | { type: "token"; content: string }
  | { type: "status"; message: string }
  | { type: "workout"; workout: GeneratedWorkout; warnings: string[] }
  | { type: "done" }
  | { type: "error"; message: string };

type SaveResponse =
  | { type: "saved"; workout: GeneratedWorkout; warnings: string[]; persistence: WorkoutPersistence }
  | { error: string; message: string };

type LoadChatResponse = {
  sessionId: string;
  session: { intake_summary?: WorkoutIntake | null };
  messages: Array<WorkoutChatMessage & { id?: string; created_at?: string | null }>;
  warning?: string;
};

const STARTER_MESSAGE: WorkoutChatMessage = {
  role: "assistant",
  content:
    "Tell me what you want from today’s session. I can work with messy notes, goal, kit, time, level, injuries, boxing focus, whatever you’ve got.",
};

function IntakePill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function ExerciseCard({
  item,
  rejected,
  disabled,
  onReject,
}: {
  item: GeneratedWorkout["blocks"][number]["items"][number];
  rejected: boolean;
  disabled: boolean;
  onReject: () => void;
}) {
  return (
    <div className={`rounded-2xl p-4 ${rejected ? "border border-red-400/40 bg-red-500/10" : "bg-white/[0.05]"}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-base font-black text-white">{item.exercise?.title ?? item.exerciseId}</p>
          <p className="mt-1 text-sm leading-6 text-zinc-300">{item.coachingNote}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <p className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase text-black">
            {item.sets ? `${item.sets} sets` : item.durationSeconds ? `${item.durationSeconds}s` : "work"}
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={onReject}
            className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-40 ${
              rejected ? "border-red-300 bg-red-300 text-black" : "border-white/15 text-white hover:bg-white/10"
            }`}
          >
            {rejected ? "Rejected" : "Swap"}
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-zinc-300">
        {item.reps && <span className="rounded-full bg-white/10 px-3 py-1">{item.reps}</span>}
        {item.restSeconds !== null && <span className="rounded-full bg-white/10 px-3 py-1">Rest {item.restSeconds}s</span>}
        {item.tempo && <span className="rounded-full bg-white/10 px-3 py-1">Tempo {item.tempo}</span>}
      </div>
    </div>
  );
}

function WorkoutPreview({
  workout,
  persistence,
  warnings,
  rejectedExerciseIds,
  busy,
  onReject,
  onSwapRejected,
  onSave,
}: {
  workout: GeneratedWorkout;
  persistence: WorkoutPersistence | null;
  warnings: string[];
  rejectedExerciseIds: string[];
  busy: boolean;
  onReject: (exerciseId: string) => void;
  onSwapRejected: () => void;
  onSave: () => void;
}) {
  const rejectedCount = rejectedExerciseIds.length;

  return (
    <section className="rounded-[2rem] border border-[#007aff]/35 bg-[#07111f] p-5 shadow-2xl shadow-black/30 sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#7db7ff]">Review draft</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-white">{workout.title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">{workout.summary}</p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-wide text-white">
          {persistence?.status === "saved" ? "Saved" : "Needs approval"}
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <IntakePill label="Time" value={`${workout.durationMinutes} min`} />
        <IntakePill label="Level" value={workout.difficulty} />
        <IntakePill label="Kit" value={workout.equipment.join(", ") || "bodyweight"} />
      </div>

      <div className="mt-7 space-y-5">
        {workout.blocks.map((block, blockIndex) => (
          <div key={`${block.type}-${blockIndex}`} className="rounded-3xl border border-white/10 bg-black/25 p-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ff4d4d]">{block.type}</p>
            <h3 className="mt-2 text-xl font-black text-white">{block.title}</h3>
            <div className="mt-4 space-y-3">
              {block.items.map((item, itemIndex) => (
                <ExerciseCard
                  key={`${item.exerciseId}-${itemIndex}`}
                  item={item}
                  rejected={rejectedExerciseIds.includes(item.exerciseId)}
                  disabled={busy || persistence?.status === "saved"}
                  onReject={() => onReject(item.exerciseId)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {(workout.safetyNotes.length > 0 || warnings.length > 0 || persistence?.reason) && (
        <div className="mt-6 rounded-3xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-6 text-amber-50">
          {[...workout.safetyNotes, ...warnings, persistence?.reason].filter(Boolean).map((note) => (
            <p key={note}>• {note}</p>
          ))}
        </div>
      )}

      <p className="mt-5 text-sm font-semibold leading-6 text-zinc-300">{workout.progressionNote}</p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={busy || rejectedCount === 0 || persistence?.status === "saved"}
          onClick={onSwapRejected}
          className="rounded-full border border-white/15 px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Swap {rejectedCount || "rejected"}
        </button>
        <button
          type="button"
          disabled={busy || rejectedCount > 0 || persistence?.status === "saved"}
          onClick={onSave}
          className="rounded-full bg-[#007aff] px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#1b8cff] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Approve and save
        </button>
      </div>
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
  const [rejectedExerciseIds, setRejectedExerciseIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, status]);

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

  async function readWorkoutStream(response: Response, baseMessages: WorkoutChatMessage[]) {
    if (!response.body) throw new Error("Workout stream did not start.");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let assistantIndex: number | null = null;
    let assistantText = "";

    const appendAssistant = (content: string) => {
      if (assistantIndex === null) {
        assistantIndex = baseMessages.length;
        setMessages([...baseMessages, { role: "assistant", content }]);
        return;
      }
      setMessages((current) => current.map((message, index) => (index === assistantIndex ? { ...message, content } : message)));
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line) as StreamEvent;

        if (event.type === "session") setSessionId(event.sessionId);
        if (event.type === "intake") setIntake(event.intake);
        if (event.type === "status") setStatus(event.message);
        if (event.type === "token") {
          assistantText += event.content;
          appendAssistant(assistantText);
        }
        if (event.type === "question") {
          appendAssistant(event.message);
          setStatus(null);
        }
        if (event.type === "workout") {
          setWorkout(event.workout);
          setPersistence(null);
          setWarnings(event.warnings);
          setRejectedExerciseIds([]);
          setStatus("Review the draft, swap anything off, then approve to save.");
          if (!assistantText) appendAssistant("I’ve built a draft. Review the exercise choices before we save it.");
        }
        if (event.type === "error") throw new Error(event.message);
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();
    if (!content || loading) return;

    const nextMessages: WorkoutChatMessage[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setStatus("Thinking...");
    setError(null);

    try {
      const response = await fetch("/api/chat/workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "chat", sessionId, messages: nextMessages, intake, rejectedExerciseIds }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "Workout creator failed.");
      }

      await readWorkoutStream(response, nextMessages);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Workout creator failed.";
      setError(message);
      setMessages([...nextMessages, { role: "assistant", content: "That hit a snag. Try again or tweak the request." }]);
    } finally {
      setLoading(false);
      setStatus(null);
    }
  }

  async function handleSwapRejected() {
    if (!workout || !intake || rejectedExerciseIds.length === 0 || loading) return;
    setLoading(true);
    setStatus("Finding better matches...");
    setError(null);

    const nextMessages: WorkoutChatMessage[] = [
      ...messages,
      { role: "user", content: `Swap these exercises: ${rejectedExerciseIds.join(", ")}` },
    ];
    setMessages(nextMessages);

    try {
      const response = await fetch("/api/chat/workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "swap", sessionId, messages: nextMessages, intake, workout, rejectedExerciseIds, instruction: "Swap rejected exercises for better alternatives." }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "Swap failed.");
      }

      await readWorkoutStream(response, nextMessages);
      setMessages((current) => [...current, { role: "assistant", content: "Swapped. Give this version a look before saving." }]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Swap failed.");
    } finally {
      setLoading(false);
      setStatus(null);
    }
  }

  async function handleSave() {
    if (!workout || !intake || loading) return;
    setLoading(true);
    setStatus("Saving workout...");
    setError(null);

    try {
      const response = await fetch("/api/chat/workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "save", sessionId, intake, workout, rejectedExerciseIds }),
      });
      const payload = (await response.json()) as SaveResponse;

      if (!response.ok || "error" in payload) {
        throw new Error("message" in payload ? payload.message : "Save failed.");
      }

      setWorkout(payload.workout);
      setWarnings(payload.warnings);
      setPersistence(payload.persistence);
      setMessages((current) => [...current, { role: "assistant", content: payload.persistence.status === "saved" ? "Saved. That one’s ready to run." : "Workout is approved, but only previewed because saving is not fully available yet." }]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Save failed.");
    } finally {
      setLoading(false);
      setStatus(null);
    }
  }

  function toggleRejected(exerciseId: string) {
    setRejectedExerciseIds((current) => (current.includes(exerciseId) ? current.filter((id) => id !== exerciseId) : [...current, exerciseId]));
  }

  return (
    <div className="text-white">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1fr)_440px]">
        <section className="flex min-h-[76vh] flex-col rounded-[2rem] border border-white/10 bg-[#0b0f17] p-4 shadow-2xl shadow-black/30 sm:p-5">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-1 pb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#7db7ff]">Oracle Performance Lab</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Workout creator</h1>
            </div>
            <div className="flex gap-2">
              <Link href="/app/chats" className="rounded-full border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-wide text-white hover:bg-white/10">
                History
              </Link>
              <Link href="/app" className="hidden rounded-full border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-wide text-white hover:bg-white/10 sm:block">
                Back
              </Link>
            </div>
          </div>

          <div ref={scrollRef} className="mt-4 flex-1 space-y-5 overflow-y-auto rounded-3xl bg-black/20 p-3 sm:p-5">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[88%] whitespace-pre-wrap rounded-[1.35rem] px-4 py-3 text-sm leading-6 shadow-lg ${
                    message.role === "user" ? "bg-[#007aff] text-white" : "border border-white/10 bg-white/[0.07] text-zinc-100"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.07] px-4 py-3 text-sm text-zinc-300">
                  <span className="mr-2 inline-flex h-2 w-2 animate-pulse rounded-full bg-[#7db7ff]" />
                  {status ?? "Typing..."}
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="mt-4 rounded-[1.75rem] border border-white/10 bg-black/35 p-2 shadow-inner shadow-black/40">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={1}
                placeholder="Example: 35 min, dumbbells, intermediate, gas tank, no injuries"
                className="min-h-12 min-w-0 flex-1 resize-none bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500"
              />
              <button
                disabled={loading || !input.trim()}
                className="self-end rounded-full bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </form>

          {sessionId && (
            <p className="mt-3 text-xs font-semibold text-zinc-500">
              Saved chat. Resume link: <Link className="text-[#7db7ff] hover:underline" href={`/app/create?sessionId=${sessionId}`}>open this session</Link>
            </p>
          )}
          {error && <p className="mt-3 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</p>}
        </section>

        <aside className="space-y-5">
          {intakeSummary.length > 0 && (
            <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 sm:p-7">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-zinc-500">Current brief</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {intakeSummary.map(([label, value]) => (
                  <IntakePill key={label} label={label} value={value} />
                ))}
              </div>
            </section>
          )}

          {workout ? (
            <WorkoutPreview
              workout={workout}
              persistence={persistence}
              warnings={warnings}
              rejectedExerciseIds={rejectedExerciseIds}
              busy={loading}
              onReject={toggleRejected}
              onSwapRejected={handleSwapRejected}
              onSave={handleSave}
            />
          ) : (
            <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-7">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-zinc-500">How it works</p>
              <h2 className="mt-3 text-2xl font-black">Chat first, save later</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-300">
                The AI reads the goal, searches uploaded Supabase free-exercise-db rows, streams its assumptions, then gives you a draft. Swap weak exercises before it saves to workouts.
              </p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
