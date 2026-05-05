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
        model: process.env.OPENAI_WORKOUT_MODEL ?? "gpt-4o-mini",
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
