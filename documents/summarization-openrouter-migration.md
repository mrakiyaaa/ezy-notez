# Summarization — OpenRouter Migration

## Overview

Replaced the local distilBART summarization pipeline (Python subprocess) with direct OpenRouter API calls made from the Express backend service. The change is entirely backend-side; the frontend response shape and polling flow are unchanged.

## What Changed

### Removed
- `backend/scripts/summarize_text.py` — the distilBART / sumy / stdlib extractive-summarization script
- All `child_process.spawn` logic and `spawnPythonScriptWithStdin` from `summary.service.ts`
- The `toUserFriendlyError` helper that translated Python stderr into user messages

### Modified
- `backend/src/services/summary.service.ts` — complete rewrite of the summarization pipeline layer; all other CRUD functions (get, delete) are unchanged
- `backend/src/__tests__/unit/summary.service.unit.test.ts` — replaced `child_process` mock with `axios` mock
- `backend/src/__tests__/integration/summary.integration.test.ts` — same

## Architecture

```
Frontend (polling)
      │
      ▼
Express route  POST /summaries/general | /summaries/custom
      │
      ▼
summary.service.ts
  ├── Insert pending SummaryRow → return to client immediately
  └── Background pipeline (fire-and-forget)
        ├── General mode: summarize each resource → combine via second call
        └── Custom mode:  summarize each resource independently
              │
              ▼
        callOpenRouterForSummary()
              │  POST https://openrouter.ai/api/v1/chat/completions
              │  Model: meta-llama/llama-3.1-8b-instruct
              │  (same provider as quiz generation)
              ▼
        Update SummaryRow: status → ready | failed
```

## OpenRouter Configuration

| Key | Value |
|-----|-------|
| API URL | `https://openrouter.ai/api/v1/chat/completions` |
| Model | `meta-llama/llama-3.1-8b-instruct` |
| Env var | `OPENROUTER_API_KEY` (shared with quiz-ml service) |
| Timeout | 60 s |
| Temperature | 0.3 (deterministic, academic content) |

## Format Modes

| `SummaryFormat` | Prompt instruction | Output heading |
|---|---|---|
| `"bullet"` | Concise bullet-point key points | `## Key Points` |
| `"short"` | Short single-paragraph overview | `## Summary` |
| `"detailed"` | Detailed multi-paragraph summary | `## Detailed Summary` |

Output is plain markdown rendered by `react-markdown` in `SummaryContent.tsx`.

## General Mode — Two-Pass Strategy

1. **Pass 1**: Each workspace resource is summarized independently (one OpenRouter call per resource).
2. **Pass 2**: The intermediate summaries are combined into a single cohesive final summary via a second OpenRouter call.

This avoids concatenating large raw texts and produces higher-quality results than the old single-pass distilBART approach.

## Error Handling

| Scenario | `error_message` stored / thrown |
|---|---|
| OpenRouter non-2xx | `"OpenRouter error: <extracted message>"` |
| Request timeout (60 s) | `"Summarization request timed out. Please try again."` |
| Empty resource text | `"No content found for this resource."` |
| Missing API key | `"OpenRouter error: OPENROUTER_API_KEY is not configured on this server."` |

Errors in the background pipeline are stored in the `error_message` column with `status = "failed"`. The frontend reads this on the next poll cycle and renders it via `FailedSummary` in `SummaryContent.tsx`.

## No Frontend Changes Required

The response shape from the API (`SummaryRow` with `status: "pending"`) is identical to the previous implementation. The frontend polling loop, phase state machine, and all UI components are unmodified.
