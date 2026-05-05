"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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

function IntakePill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
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
    <div className={`rounded-lg p-4 ${rejected ? "border border-red-400/40 bg-red-500/10" : "bg-slate-50"}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-base font-semibold text-slate-950">{item.exercise?.title ?? item.exerciseId}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{item.coachingNote}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <p className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase text-black">
            {item.sets ? `${item.sets} sets` : item.durationSeconds ? `${item.durationSeconds}s` : "work"}
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={onReject}
            className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-40 ${
              rejected ? "border-red-300 bg-red-300 text-black" : "border-slate-300 text-slate-950 hover:bg-slate-100"
            }`}
          >
            {rejected ? "Rejected" : "Swap"}
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
        {item.reps && <span className="rounded-full bg-slate-100 px-3 py-1">{item.reps}</span>}
        {item.restSeconds !== null && <span className="rounded-full bg-slate-100 px-3 py-1">Rest {item.restSeconds}s</span>}
        {item.tempo && <span className="rounded-full bg-slate-100 px-3 py-1">Tempo {item.tempo}</span>}
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
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#7db7ff]">Review draft</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{workout.title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{workout.summary}</p>
        </div>
        <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-950">
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
          <div key={`${block.type}-${blockIndex}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#ff4d4d]">{block.type}</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">{block.title}</h3>
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
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
          {[...workout.safetyNotes, ...warnings, persistence?.reason].filter(Boolean).map((note) => (
            <p key={note}>• {note}</p>
          ))}
        </div>
      )}

      <p className="mt-5 text-sm font-semibold leading-6 text-slate-600">{workout.progressionNote}</p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={busy || rejectedCount === 0 || persistence?.status === "saved"}
          onClick={onSwapRejected}
          className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Swap {rejectedCount || "rejected"}
        </button>
        <button
          type="button"
          disabled={busy || rejectedCount > 0 || persistence?.status === "saved"}
          onClick={onSave}
          className="rounded-full bg-[#007aff] px-5 py-3 text-sm font-semibold uppercase tracking-wide text-slate-950 transition hover:bg-[#1b8cff] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Approve and save
        </button>
      </div>
    </section>
  );
}

export default function CreateWorkoutPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WorkoutChatMessage[]>([]);
  const [userName, setUserName] = useState("there");
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
    let cancelled = false;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const email = data.user?.email ?? "";
      const metaName = data.user?.user_metadata?.name || data.user?.user_metadata?.full_name;
      const fallback = email ? email.split("@")[0].split(/[._-]/)[0] : "there";
      const name = typeof metaName === "string" && metaName.trim() ? metaName.trim().split(" ")[0] : fallback;
      setUserName(name ? name.charAt(0).toUpperCase() + name.slice(1) : "there");
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
        setMessages(payload.messages.length ? payload.messages.map((message) => ({ role: message.role, content: message.content })) : []);
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
    <div className="min-h-[calc(100vh-7rem)] text-slate-950">
      {!messages.length && !workout ? (
        <section className="flex min-h-[70vh] flex-col items-center justify-center px-4">
          <h1 className="text-center text-xl font-medium tracking-tight text-slate-950 sm:text-2xl">
            Hey, {userName}. What would you like to train?
          </h1>

          <form onSubmit={handleSubmit} className="mt-10 w-full max-w-3xl">
            <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
              <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-2xl font-light text-slate-700 hover:bg-slate-100" aria-label="Add details">
                +
              </button>
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Describe the strength and conditioning session you have in mind"
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
              />
              <button type="button" className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 sm:flex" aria-label="Voice input">
                ◦
              </button>
              <button
                disabled={loading || !input.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send"
              >
                ↑
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-5xl flex-col">
          <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto px-2 py-6 sm:px-6">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[82%] whitespace-pre-wrap rounded-3xl px-4 py-3 text-sm leading-6 ${
                    message.role === "user" ? "bg-slate-100 text-slate-950" : "bg-white text-slate-950"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-3xl bg-white px-4 py-3 text-sm text-slate-500">
                  {status ?? "Typing..."}
                </div>
              </div>
            )}
            {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            {intakeSummary.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-3">
                {intakeSummary.map(([label, value]) => (
                  <IntakePill key={label} label={label} value={value} />
                ))}
              </div>
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
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="sticky bottom-4 mx-auto w-full max-w-3xl px-2 sm:px-0">
            <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
              <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-2xl font-light text-slate-700 hover:bg-slate-100" aria-label="Add details">
                +
              </button>
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Describe the strength and conditioning session you have in mind"
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
              />
              <button type="button" className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 sm:flex" aria-label="Voice input">
                ◦
              </button>
              <button
                disabled={loading || !input.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send"
              >
                ↑
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
