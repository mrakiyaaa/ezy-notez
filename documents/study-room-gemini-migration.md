# Study Room AI: OpenRouter → Gemini Migration

## Why
OpenRouter returned `402 Insufficient Credits` when starting a study room. The
quiz-generation request asked for up to 8192 tokens but the account could only
afford ~7604, causing room creation to fail outright. Rather than top-up + cap
tokens, the AI provider for study rooms is switched to Google's Gemini API
directly. The model in use (`google/gemini-3-flash-preview-20251217` via
OpenRouter) is already Gemini under the hood — going direct removes the broker
and its credit ceiling.

## Scope
Only the **study room** feature is migrated. The summary feature continues to
use OpenRouter (`backend/src/services/summary.service.ts` is untouched).

## Changes

### New file
- `backend/src/utils/geminiClient.ts` — `callGemini(systemPrompt, userPrompt, model, maxTokens)`
  - POSTs to `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}`
  - Body shape: `{ systemInstruction, contents:[{role:'user',parts:[{text}]}], generationConfig:{maxOutputTokens} }`
  - Response parse: joins `candidates[0].content.parts[*].text`
  - Surfaces `promptFeedback.blockReason` as an error
  - 120s timeout, same diagnostic error shape as `callOpenRouter`

### Modified
- `backend/src/services/studyRoomAI.service.ts`
  - `MODEL` constant changed from `google/gemini-3-flash-preview-20251217` to `gemini-2.5-flash`
  - Imports `callGemini` instead of `callOpenRouter`
  - Both `generateRoomQuestions` and `generateInsights` now route through Gemini
  - Added `extractJsonArray()` helper so a stray Gemini preamble around the JSON array doesn't fail parsing (was: only `stripFences`)
- Unit + integration test mocks updated to the Gemini response shape and `GEMINI_API_KEY` env var

### Unchanged
- Channel names, event names, RLS policies, frontend code
- `backend/src/utils/openRouterClient.ts` (still used by `summary.service`)

## Required env var
Add to `backend/.env` and Railway:

```
GEMINI_API_KEY=<your Google AI Studio key>
```

Key obtained from https://aistudio.google.com/apikey. `OPENROUTER_API_KEY` may
remain set — it is no longer read by study-room code.

## Model choice
`gemini-2.5-flash` — current stable Flash tier, broadly available, generous free
quota, fast enough for the ~20–60 question quiz prompt.

## Rollback
Revert `studyRoomAI.service.ts` to import `callOpenRouter` and restore the
previous `MODEL` constant. `geminiClient.ts` can stay (unused).
