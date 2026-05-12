import axios from "axios";

// ---------------------------------------------------------------------------
// Google Gemini REST API client (generateContent)
// Used by studyRoomAI.service for quiz generation and insight summaries.
// ---------------------------------------------------------------------------

const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 120_000;

interface GeminiPart {
  text: string;
}

interface GeminiCandidate {
  content?: { parts?: GeminiPart[] };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  promptFeedback?: { blockReason?: string };
}

/**
 * Send a generateContent request to Google's Gemini REST API and return the
 * model's text response (candidates[0].content.parts[0].text, concatenated
 * across parts).
 *
 * Throws a descriptive Error on:
 *   - Missing API key
 *   - Non-2xx HTTP response (includes status + body in message)
 *   - Network timeout
 *   - Empty/blocked content in the response
 */
export const callGemini = async (
  systemPrompt: string,
  userPrompt: string,
  model: string,
  maxTokens = 8192,
): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured on this server. " +
        "Set it in the backend .env file.",
    );
  }

  const url = `${GEMINI_BASE_URL}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: { maxOutputTokens: maxTokens },
  };

  try {
    const response = await axios.post<GeminiResponse>(url, body, {
      timeout: TIMEOUT_MS,
      headers: { "Content-Type": "application/json" },
    });

    const blockReason = response.data?.promptFeedback?.blockReason;
    if (blockReason) {
      throw new Error(`Gemini blocked the prompt: ${blockReason}`);
    }

    const parts = response.data?.candidates?.[0]?.content?.parts ?? [];
    const text = parts.map((p) => p?.text ?? "").join("").trim();

    if (!text) {
      throw new Error("Gemini returned an empty response from the model.");
    }

    return text;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
        throw new Error(
          `Gemini request timed out after ${TIMEOUT_MS / 1000}s. ` +
            "The model may be under load — please try again.",
        );
      }
      if (err.response) {
        const status = err.response.status;
        const body =
          typeof err.response.data === "string"
            ? err.response.data.slice(0, 400)
            : JSON.stringify(err.response.data).slice(0, 400);
        throw new Error(`Gemini returned ${status}: ${body}`);
      }
    }
    throw err instanceof Error ? err : new Error(String(err));
  }
};
