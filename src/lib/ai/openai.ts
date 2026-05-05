type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatCompletionChoice = {
  message?: {
    content?: string | null;
  };
};

type ChatCompletionResponse = {
  choices?: ChatCompletionChoice[];
  error?: {
    message?: string;
  };
};

type StreamChunk = {
  choices?: Array<{
    delta?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

export function workoutModel() {
  return process.env.OPENAI_WORKOUT_MODEL ?? "gpt-4o-mini";
}

export async function openAiJson<T>(messages: ChatMessage[], fallback: T): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return fallback;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: workoutModel(),
        messages,
        response_format: { type: "json_object" },
        temperature: 0.25,
      }),
    });

    const payload = (await response.json()) as ChatCompletionResponse;

    if (!response.ok) {
      console.warn("OpenAI workout request failed, using fallback:", payload.error?.message ?? response.statusText);
      return fallback;
    }

    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      console.warn("OpenAI workout request returned empty content, using fallback.");
      return fallback;
    }

    try {
      return JSON.parse(content) as T;
    } catch (error) {
      console.warn("OpenAI workout JSON parse failed, using fallback:", error instanceof Error ? error.message : "Unknown parse error");
      return fallback;
    }
  } catch (error) {
    console.warn("OpenAI workout request errored, using fallback:", error instanceof Error ? error.message : "Unknown OpenAI error");
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}

export async function* openAiTextStream(messages: ChatMessage[], fallback: string): AsyncGenerator<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    yield fallback;
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 22000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: workoutModel(),
        messages,
        stream: true,
        temperature: 0.45,
      }),
    });

    if (!response.ok || !response.body) {
      yield fallback;
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") return;

        try {
          const chunk = JSON.parse(data) as StreamChunk;
          const token = chunk.choices?.[0]?.delta?.content;
          if (token) yield token;
        } catch {
          // Ignore malformed streaming fragments.
        }
      }
    }
  } catch (error) {
    console.warn("OpenAI workout stream failed, using fallback:", error instanceof Error ? error.message : "Unknown OpenAI error");
    yield fallback;
  } finally {
    clearTimeout(timeout);
  }
}
