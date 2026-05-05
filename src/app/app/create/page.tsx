"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
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


function AnimatedThinking({ status }: { status: string | null }) {
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setDotCount((current) => (current >= 3 ? 1 : current + 1));
    }, 360);

    return () => window.clearInterval(interval);
  }, []);

  if (status && status !== "Thinking...") return <>{status}</>;

  return <>Thinking{".".repeat(dotCount)}</>;
}

function PromptBar({
  input,
  loading,
  onInput,
  onSubmit,
}: {
  input: string;
  loading: boolean;
  onInput: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="w-full max-w-3xl rounded-full border border-zinc-200 bg-white px-3 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
      <div className="flex items-center gap-3">
        <input
          value={input}
          onChange={(event) => onInput(event.target.value)}
          placeholder="Describe the strength and conditioning session you have in mind"
          className="h-11 min-w-0 flex-1 bg-transparent text-sm text-black outline-none placeholder:text-zinc-400"
        />
        <button disabled={loading || !input.trim()} aria-label="Send" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40">
          <span className="text-lg leading-none">↑</span>
        </button>
      </div>
    </form>
  );
}

function ExerciseCard({
  item,
}: {
  item: GeneratedWorkout["blocks"][number]["items"][number];
}) {
  const prescription = [
    item.sets ? `${item.sets} sets` : null,
    item.reps,
    item.durationSeconds ? `${item.durationSeconds}s` : null,
    item.restSeconds !== null ? `rest ${item.restSeconds}s` : null,
    item.tempo ? `tempo ${item.tempo}` : null,
  ].filter(Boolean).join(" · ");

  return (
    <div className="flex gap-4 border-t border-zinc-100 py-5 first:border-t-0">
      {item.exercise?.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.exercise.imageUrl}
          alt={item.exercise.title}
          className="h-20 w-20 shrink-0 rounded-2xl border border-zinc-200 object-cover sm:h-24 sm:w-24"
          loading="lazy"
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <h4 className="text-base font-semibold text-black">{item.exercise?.title ?? item.exerciseId}</h4>
        {prescription && <p className="mt-1 text-sm font-medium text-zinc-600">{prescription}</p>}
        <p className="mt-2 text-sm leading-6 text-zinc-600">{item.coachingNote}</p>
      </div>
    </div>
  );
}

function WorkoutPreview({
  workout,
  persistence,
  warnings,
  onSave,
}: {
  workout: GeneratedWorkout;
  persistence: WorkoutPersistence | null;
  warnings: string[];
  onSave: () => void;
}) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-black">{workout.title}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">{workout.summary}</p>
      </div>

      <div className="mt-7 space-y-5">
        {workout.blocks.map((block, blockIndex) => (
          <div key={`${block.type}-${blockIndex}`} className="border-t border-zinc-200 pt-5 first:border-t-0 first:pt-0">
            <h3 className="text-xl font-semibold text-black">{block.title}</h3>
            <div className="mt-3">
              {block.items.map((item, itemIndex) => (
                <ExerciseCard key={`${item.exerciseId}-${itemIndex}`} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {(workout.safetyNotes.length > 0 || warnings.length > 0 || persistence?.reason) && (
        <div className="mt-6 text-sm leading-6 text-zinc-600">
          {[...workout.safetyNotes, ...warnings, persistence?.reason].filter(Boolean).map((note) => (
            <p key={note}>• {note}</p>
          ))}
        </div>
      )}

      <p className="mt-5 text-sm font-semibold leading-6 text-slate-600">{workout.progressionNote}</p>

      <div className="mt-6">
        <button
          type="button"
          disabled={persistence?.status === "saved"}
          onClick={onSave}
          className="rounded-full bg-[#007aff] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1b8cff] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {persistence?.status === "saved" ? "Saved" : "Approve and save"}
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

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-white text-black">
      {!messages.length && !workout ? (
        <section className="relative mx-auto min-h-[calc(100vh-5rem)] w-full max-w-5xl px-4">
          <div className="absolute inset-x-4 bottom-32 text-center">
            <h1 className="text-[22px] font-medium tracking-[-0.02em] text-black sm:text-3xl">
              Hey, {userName}. What would you like to train?
            </h1>
          </div>
          <div className="absolute inset-x-4 bottom-8 z-10 mx-auto w-auto max-w-3xl">
            <PromptBar input={input} loading={loading} onInput={setInput} onSubmit={handleSubmit} />
            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          </div>
        </section>
      ) : (
        <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl flex-col px-4">
          <div ref={scrollRef} className="flex-1 space-y-8 overflow-y-auto pb-10 pt-10 sm:px-8">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                {message.role === "user" ? (
                  <div className="max-w-[70%] rounded-full bg-zinc-100 px-4 py-2 text-sm leading-6 text-black">
                    {message.content}
                  </div>
                ) : (
                  <div className="max-w-3xl text-left">
                    <div className="whitespace-pre-wrap text-sm font-medium leading-7 text-black">{message.content}</div>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="max-w-3xl text-sm font-medium leading-7 text-black">
                  <AnimatedThinking status={status} />
                </div>
              </div>
            )}
            {error && <p className="max-w-3xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            {workout ? (
              <WorkoutPreview
                workout={workout}
                persistence={persistence}
                warnings={warnings}
                onSave={handleSave}
              />
            ) : null}
          </div>

          <div className="sticky bottom-5 z-10 mx-auto w-full max-w-3xl pb-2">
            <PromptBar input={input} loading={loading} onInput={setInput} onSubmit={handleSubmit} />
          </div>
        </section>
      )}
    </main>
  );
}
