"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { GeneratedWorkout, WorkoutChatMessage, WorkoutIntake, WorkoutPersistence } from "@/lib/ai/workout-types";

type StreamEvent =
  | { type: "session"; sessionId: string; warnings: string[] }
  | { type: "intake"; intake: WorkoutIntake }
  | { type: "question"; message: string; questions: string[] }
  | { type: "token"; content: string }
  | { type: "status"; message: string }
  | { type: "debug"; label: string; data: unknown }
  | { type: "workout"; workout: GeneratedWorkout; warnings: string[]; persistence?: WorkoutPersistence }
  | { type: "done" }
  | { type: "error"; message: string };

type LoadChatResponse = {
  sessionId: string;
  session: { intake_summary?: WorkoutIntake | null; workout_id?: string | null };
  messages: Array<WorkoutChatMessage & { id?: string; created_at?: string | null }>;
  workout?: GeneratedWorkout | null;
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
  placeholder = "Describe the strength and conditioning session you have in mind",
}: {
  input: string;
  loading: boolean;
  onInput: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  placeholder?: string;
}) {
  return (
    <form onSubmit={onSubmit} className="w-full max-w-3xl rounded-full border border-zinc-200 bg-white px-3 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-colors focus-within:border-black">
      <div className="flex items-center gap-3">
        <input
          value={input}
          onChange={(event) => onInput(event.target.value)}
          placeholder={placeholder}
          className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-black outline-none placeholder:text-zinc-400"
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
      {item.exercise?.imageUrls?.length ? (
        <div className="flex shrink-0 gap-2">
          {item.exercise.imageUrls.slice(0, 2).map((url, imageIndex) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt={`${item.exercise?.title ?? "Exercise"} image ${imageIndex + 1}`}
              className="h-20 w-20 rounded-2xl border border-zinc-200 object-cover sm:h-24 sm:w-24"
              loading="lazy"
            />
          ))}
        </div>
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
}: {
  workout: GeneratedWorkout;
  persistence: WorkoutPersistence | null;
  warnings: string[];
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

      {persistence?.status === "saved" && <p className="mt-6 text-sm font-medium text-zinc-500">Saved. Message the coach to change anything.</p>}
    </section>
  );
}

function DebugPanel({
  sessionId,
  intake,
  persistence,
  warnings,
  status,
  events,
}: {
  sessionId: string | null;
  intake: WorkoutIntake | null;
  persistence: WorkoutPersistence | null;
  warnings: string[];
  status: string | null;
  events: Array<{ label: string; data: unknown; at: string }>;
}) {
  return (
    <details className="rounded-2xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 text-xs text-zinc-600">
      <summary className="cursor-pointer select-none font-semibold text-zinc-700">Debug state</summary>
      <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-white p-3 text-[11px] leading-5 text-zinc-700">
        {JSON.stringify({ sessionId, persistence, warnings, status, intake, events }, null, 2)}
      </pre>
    </details>
  );
}

function CreateWorkoutThread({ initialSessionId, showDebug }: { initialSessionId: string | null; showDebug: boolean }) {
  const router = useRouter();
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
  const [debugEvents, setDebugEvents] = useState<Array<{ label: string; data: unknown; at: string }>>([]);
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
    if (!initialSessionId) return;

    let cancelled = false;
    fetch(`/api/chat/workout?sessionId=${encodeURIComponent(initialSessionId)}`)
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
        if (payload.workout) {
          setWorkout(payload.workout);
          setPersistence(payload.session.workout_id ? { status: "saved", workoutId: payload.session.workout_id } : null);
        } else {
          setWorkout(null);
          setPersistence(null);
        }
        if (payload.warning) setError(payload.warning);
      })
      .catch((caught) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not load chat history.");
      });

    return () => {
      cancelled = true;
    };
  }, [initialSessionId]);

  async function readWorkoutStream(response: Response, baseMessages: WorkoutChatMessage[]) {
    if (!response.body) throw new Error("Workout stream did not start.");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let assistantIndex: number | null = null;
    let assistantText = "";
    let streamedSessionId: string | null = null;

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

        if (event.type === "session") {
          streamedSessionId = event.sessionId;
          setSessionId(event.sessionId);
        }
        if (event.type === "intake") setIntake(event.intake);
        if (event.type === "status") setStatus(event.message);
        if (event.type === "debug") setDebugEvents((current) => [...current.slice(-8), { label: event.label, data: event.data, at: new Date().toISOString() }]);
        if (event.type === "token") {
          assistantText += event.content;
          appendAssistant(assistantText);
        }
        if (event.type === "question") {
          if (event.message) appendAssistant(event.message);
          setStatus(null);
        }
        if (event.type === "workout") {
          setWorkout(event.workout);
          setPersistence(event.persistence ?? null);
          setWarnings(event.warnings);
          setRejectedExerciseIds([]);
          setStatus(event.persistence?.status === "saved" ? "Saved." : "Updated.");
          if (!assistantText) appendAssistant(event.persistence?.status === "saved" ? "Done. I saved the workout. Send me any changes you want." : "I’ve updated the workout.");
        }
        if (event.type === "error") throw new Error(event.message);
      }
    }

    if (streamedSessionId && initialSessionId !== streamedSessionId) {
      router.replace(`/app/create?sessionId=${streamedSessionId}`, { scroll: false });
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
    setDebugEvents((current) => [...current.slice(-8), { label: "submit", data: { mode: workout ? "edit" : "chat", sessionId, hasWorkout: Boolean(workout), messageCount: nextMessages.length }, at: new Date().toISOString() }]);

    try {
      const response = await fetch("/api/chat/workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: workout ? "edit" : "chat", sessionId, messages: nextMessages, intake, workout, rejectedExerciseIds }),
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

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-white text-black">
      {!messages.length && !workout ? (
        <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl flex-col items-center justify-center px-4 pb-28">
          <div className="w-full max-w-3xl -translate-y-10 text-center sm:-translate-y-14">
            <h1 className="text-[22px] font-medium tracking-[-0.02em] text-black sm:text-3xl">
              Hey, {userName}. What would you like to train?
            </h1>
            <div className="mt-7">
              <PromptBar input={input} loading={loading} onInput={setInput} onSubmit={handleSubmit} />
            </div>
            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          </div>
        </section>
      ) : (
        <section className={`grid min-h-[calc(100vh-5rem)] w-full gap-6 px-3 sm:px-4 lg:pl-4 lg:pr-2 ${workout ? "lg:grid-cols-[minmax(360px,0.75fr)_minmax(480px,1fr)] 2xl:grid-cols-[minmax(440px,0.72fr)_minmax(720px,1fr)]" : "mx-auto max-w-4xl grid-cols-1"}`}>
          <div className="flex min-h-[calc(100vh-5rem)] min-w-0 flex-col">
            <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto pb-10 pt-8 sm:px-4 lg:px-2 xl:px-4">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                {message.role === "user" ? (
                  <div className="max-w-[82%] rounded-2xl bg-zinc-100 px-4 py-2 text-sm leading-6 text-black lg:max-w-xl">
                    {message.content}
                  </div>
                ) : (
                  <div className="max-w-[92%] text-left lg:max-w-2xl">
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
              <div className="xl:hidden">
                <WorkoutPreview workout={workout} persistence={persistence} warnings={warnings} />
              </div>
            ) : null}
            </div>

            <div className="sticky bottom-4 z-10 mx-auto w-full max-w-2xl space-y-3 pb-2">
              {showDebug ? <DebugPanel sessionId={sessionId} intake={intake} persistence={persistence} warnings={warnings} status={status} events={debugEvents} /> : null}
              <PromptBar input={input} loading={loading} onInput={setInput} onSubmit={handleSubmit} />
            </div>
          </div>

          {workout ? (
            <aside className="hidden max-h-[calc(100vh-5rem)] overflow-y-auto py-4 pr-0 lg:block">
              <div className="ml-auto w-full max-w-none">
                <WorkoutPreview workout={workout} persistence={persistence} warnings={warnings} />
              </div>
            </aside>
          ) : null}
        </section>
      )}
    </main>
  );
}


export default function CreateWorkoutPage() {
  const searchParams = useSearchParams();
  const activeSessionId = searchParams.get("sessionId");
  const showDebug = searchParams.get("debug") === "1";

  return <CreateWorkoutThread key={activeSessionId ?? "new"} initialSessionId={activeSessionId} showDebug={showDebug} />;
}
