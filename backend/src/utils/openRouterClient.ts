import axios from "axios";

// ---------------------------------------------------------------------------
// Shared OpenRouter HTTP client
// Used by studyRoomAI.service and any future feature that calls OpenRouter.
// ---------------------------------------------------------------------------

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const TIMEOUT_MS = 120_000;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Send a chat-completion request to OpenRouter and return the model's
 * response text (choices[0].message.content).
 *
 * Throws a descriptive Error on:
 *   - Missing API key
 *   - Non-2xx HTTP response (includes status + body in message)
 *   - Network timeout
 *   - Empty/null content in the response
 */
export const callOpenRouter = async (
  systemPrompt: string,
  userPrompt: string,
  model: string,
  maxTokens = 8192,
): Promise<string> => {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not configured on this server. " +
        "Set it in the backend .env file.",
    );
  }

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  try {
    const response = await axios.post<{
      choices: { message: { content: string } }[];
    }>(
      OPENROUTER_URL,
      { model, messages, max_tokens: maxTokens },
      {
        timeout: TIMEOUT_MS,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://ezynotez.app",
          "X-Title": "EZY Notez",
        },
      },
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content || !content.trim()) {
      throw new Error("OpenRouter returned an empty response from the model.");
    }

    return content.trim();
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
        throw new Error(
          `OpenRouter request timed out after ${TIMEOUT_MS / 1000}s. ` +
            "The model may be under load — please try again.",
        );
      }
      if (err.response) {
        const status = err.response.status;
        const body =
          typeof err.response.data === "string"
            ? err.response.data.slice(0, 400)
            : JSON.stringify(err.response.data).slice(0, 400);
        throw new Error(`OpenRouter returned ${status}: ${body}`);
      }
    }
    throw err instanceof Error ? err : new Error(String(err));
  }
};
