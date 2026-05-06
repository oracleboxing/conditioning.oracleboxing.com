"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { titleFromIntake } from "@/lib/ai/chat-history";
import { planPreviewFromGeneratedWorkout } from "@/components/plans/plan-preview-adapters";
import { PlanPreview } from "@/components/plans/plan-preview";
import { createBackTarget } from "@/lib/navigation/create-back-target";
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


const THINKING_MESSAGES = ["Reading your request", "Checking the workout", "Getting ready to update it"];
const UPDATE_MESSAGES = ["Updating workout", "Finding better exercise matches", "Rebalancing the session", "Saving changes"];
const SEARCH_MESSAGES = ["Searching exercise library", "Checking exercises with images", "Finding cleaner matches"];
const BUILD_MESSAGES = ["Building workout", "Matching exercises", "Putting the session together"];

function titleFromMessages(messages: WorkoutChatMessage[]) {
  const title = messages.find((message) => message.role === "user")?.content.replace(/\s+/g, " ").trim() ?? "Workout";
  return title.length > 64 ? `${title.slice(0, 61).trim()}...` : title;
}

function AnimatedThinking({ status }: { status: string | null }) {
  const [dotCount, setDotCount] = useState(1);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const dotInterval = window.setInterval(() => {
      setDotCount((current) => (current >= 3 ? 1 : current + 1));
    }, 360);
    const messageInterval = window.setInterval(() => {
      setMessageIndex((current) => current + 1);
    }, 1800);

    return () => {
      window.clearInterval(dotInterval);
      window.clearInterval(messageInterval);
    };
  }, []);

  const baseStatus = (status ?? "Thinking").replace(/\.+$/, "");
  const lowerStatus = baseStatus.toLowerCase();
  const messages = lowerStatus.includes("updat") || lowerStatus.includes("patch")
    ? UPDATE_MESSAGES
    : lowerStatus.includes("search") || lowerStatus.includes("exercise") || lowerStatus.includes("swap")
      ? SEARCH_MESSAGES
      : lowerStatus.includes("build")
        ? BUILD_MESSAGES
        : THINKING_MESSAGES;
  const message = messages[messageIndex % messages.length] ?? baseStatus;

  return <>{message}{".".repeat(dotCount)}</>;
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

function CreateWorkoutThread({ initialSessionId, showDebug, nextPath }: { initialSessionId: string | null; showDebug: boolean; nextPath: string | null }) {
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
  const [mobileWorkoutOpen, setMobileWorkoutOpen] = useState(false);
  const [sessionHydrating, setSessionHydrating] = useState(Boolean(initialSessionId));
  const backTarget = createBackTarget(nextPath, sessionId);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const announcedSessionIds = useRef(new Set<string>());

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
    if (!initialSessionId) {
      return;
    }

    let cancelled = false;
    let retryTimer: number | null = null;

    const loadSession = async (attempt = 1): Promise<void> => {
      try {
        setSessionHydrating(true);
        const response = await fetch(`/api/chat/workout?sessionId=${encodeURIComponent(initialSessionId)}&t=${Date.now()}`, { cache: "no-store" });
        const payload = (await response.json()) as LoadChatResponse | { message?: string };
        if (!response.ok) throw new Error("message" in payload && payload.message ? payload.message : "Could not load this workout chat.");
        if (cancelled) return;

        const loaded = payload as LoadChatResponse;
        setSessionId(loaded.sessionId);
        setMessages(loaded.messages.length ? loaded.messages.map((message) => ({ role: message.role, content: message.content })) : []);
        setIntake(loaded.session.intake_summary ?? null);
        if (loaded.session.intake_summary) {
          window.dispatchEvent(
            new CustomEvent("workout-session-created", {
              detail: { id: loaded.sessionId, title: titleFromIntake(loaded.session.intake_summary) },
            }),
          );
        }

        if (loaded.workout) {
          setWorkout(loaded.workout);
          setPersistence(loaded.session.workout_id ? { status: "saved", workoutId: loaded.session.workout_id } : null);
        } else if (loaded.session.workout_id && attempt < 3) {
          // The session row can hydrate before the saved workout relation is readable.
          // Do not destroy an already-open preview, retry briefly instead.
          retryTimer = window.setTimeout(() => void loadSession(attempt + 1), 250 * attempt);
          return;
        } else if (!loaded.session.workout_id) {
          setWorkout(null);
          setMobileWorkoutOpen(false);
          setPersistence(null);
        }

        if (loaded.warning) setError(loaded.warning);
        setSessionHydrating(false);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Could not load this workout chat.");
          setSessionHydrating(false);
        }
      }
    };

    void loadSession();

    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
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
          if (!announcedSessionIds.current.has(event.sessionId)) {
            announcedSessionIds.current.add(event.sessionId);
            window.dispatchEvent(
              new CustomEvent("workout-session-created", {
                detail: { id: event.sessionId, title: titleFromMessages(baseMessages) },
              }),
            );
          }
        }
        if (event.type === "intake") {
          setIntake(event.intake);
          const activeSessionId = streamedSessionId ?? sessionId;
          if (activeSessionId) {
            window.dispatchEvent(
              new CustomEvent("workout-session-created", {
                detail: { id: activeSessionId, title: titleFromIntake(event.intake, titleFromMessages(baseMessages)) },
              }),
            );
          }
        }
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
          setMobileWorkoutOpen(true);
          setPersistence(event.persistence ?? null);
          setWarnings(event.warnings);
          setRejectedExerciseIds([]);
          setStatus(event.persistence?.status === "saved" ? "Saved" : "Updated");
          if (!assistantText) appendAssistant(event.persistence?.status === "saved" ? "Done. I saved the workout. Send me any changes you want." : "I’ve updated the workout.");
        }
        if (event.type === "error") throw new Error(event.message);
      }
    }

    if (streamedSessionId && initialSessionId !== streamedSessionId) {
      const nextQuery = nextPath ? `&next=${encodeURIComponent(nextPath)}` : "";
      router.replace(`/app/create?sessionId=${streamedSessionId}${nextQuery}`, { scroll: false });
      router.refresh();
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
    <main className="flex h-full min-h-0 flex-col bg-white text-black">
      <div className="z-40 flex shrink-0 items-center justify-between bg-transparent px-4 pb-3 pt-1">
        <Link href={backTarget.href} className="rounded-full border border-zinc-200 bg-white/85 px-3 py-2 text-sm font-semibold text-zinc-600 shadow-sm backdrop-blur transition hover:text-black">
          ← Back to {backTarget.label}
        </Link>
      </div>
      {sessionHydrating ? (
        <section className="mx-auto flex min-h-0 flex-1 w-full max-w-5xl flex-col items-center justify-center px-4 pb-28 text-center">
          <div className="w-full max-w-xs -translate-y-10">
            <p className="text-sm font-medium text-zinc-500">Opening plan chat...</p>
          </div>
        </section>
      ) : !messages.length && !workout ? (
        <section className="mx-auto flex min-h-0 flex-1 w-full max-w-5xl flex-col items-center justify-center px-4 pb-28">
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
        <section className={`relative grid min-h-0 flex-1 w-full gap-5 px-0 sm:px-4 lg:pl-4 lg:pr-2 ${workout ? "sm:grid-cols-[minmax(220px,0.78fr)_minmax(300px,1fr)] md:grid-cols-[minmax(280px,0.85fr)_minmax(340px,1fr)] xl:grid-cols-[minmax(360px,0.75fr)_minmax(520px,1fr)] 2xl:grid-cols-[minmax(440px,0.72fr)_minmax(720px,1fr)]" : "mx-auto max-w-4xl grid-cols-1"}`}>
          <div className="relative flex min-h-0 min-w-0 flex-col">
            <div ref={scrollRef} className={`min-h-0 flex-1 overflow-y-auto ${workout && mobileWorkoutOpen ? "px-4 pb-6 pt-6 sm:hidden" : "space-y-6 px-4 pb-8 pt-16 sm:px-4 sm:pb-10 sm:pt-8 lg:px-2 xl:px-4"}`}>
            {workout && mobileWorkoutOpen ? (
              <PlanPreview plan={planPreviewFromGeneratedWorkout(workout)} />
            ) : messages.map((message, index) => (
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
            {(!mobileWorkoutOpen || !workout) && loading && status ? (
              <div className="flex justify-start">
                <div className="max-w-3xl text-sm font-medium leading-7 text-black">
                  <AnimatedThinking status={status} />
                </div>
              </div>
            ) : null}
            {(!mobileWorkoutOpen || !workout) && error && <p className="max-w-3xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            </div>

            <div className="z-30 mx-auto w-full max-w-2xl shrink-0 space-y-3 bg-transparent px-4 pb-2 pt-3 sm:px-0">
              {workout ? (
                <div className="flex justify-end sm:hidden">
                  <button
                    type="button"
                    onClick={() => setMobileWorkoutOpen((open) => !open)}
                    className="rounded-full bg-[#007aff] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,122,255,0.28)] transition hover:bg-[#2f96ff]"
                  >
                    {mobileWorkoutOpen ? "Back to Chat" : "Preview Plan"}
                  </button>
                </div>
              ) : null}
              {showDebug ? <DebugPanel sessionId={sessionId} intake={intake} persistence={persistence} warnings={warnings} status={status} events={debugEvents} /> : null}
              <PromptBar input={input} loading={loading} onInput={setInput} onSubmit={handleSubmit} />
            </div>
          </div>

          {workout ? (
            <aside className="hidden max-h-[calc(100vh-5rem)] overflow-y-auto py-4 pr-0 sm:block">
              <div className="ml-auto w-full max-w-none">
                <PlanPreview plan={planPreviewFromGeneratedWorkout(workout)} />
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
  const nextPath = searchParams.get("next");

  return <CreateWorkoutThread initialSessionId={activeSessionId} showDebug={showDebug} nextPath={nextPath} />;
}
