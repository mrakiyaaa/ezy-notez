# Markdown Output Enhancement for AI Summarization

## Overview

The AI summarization pipeline now outputs properly formatted Markdown from the Python script, rendered on the frontend using `react-markdown`.

## Changes Made

### 1. Python Script (`backend/scripts/summarize_text.py`)

The `format_output` function was updated to prepend a Markdown heading to each format type:

| Format | Heading | Structure |
|--------|---------|-----------|
| `bullet` | `## Key Points` | Unordered list (`- item`) |
| `short` | `## Summary` | Single paragraph |
| `detailed` | `## Detailed Summary` | Multi-paragraph with `\n\n` separators |

Both the primary distilbart model and the sumy fallback flow through the same `format_output` function, so Markdown is guaranteed regardless of which model ran.

### 2. Frontend Dependency (`frontend/package.json`)

Added `react-markdown` for rendering Markdown content in React components.

### 3. SummaryContent Component (`frontend/src/components/workspace/summarization/SummaryContent.tsx`)

Replaced the manual line-by-line parser with `<ReactMarkdown>` using custom `components` overrides:

- **`h2`** — Styled with workspace aura accent color (`auraHex`), `text-lg font-semibold`
- **`p`** — `text-text-primary text-sm leading-relaxed`
- **`ul`** — `flex flex-col gap-2`
- **`li`** — Preserves the existing colored-dot bullet style using a `w-2 h-2 rounded-full` span with `backgroundColor: auraHex`
- **`strong`** / **`em`** — Styled with project text tokens

Error and empty content states are unchanged.

### 4. Preview Utility (`frontend/src/components/workspace/summarization/constants.ts`)

Updated `getBatchPreview` to strip Markdown headings (`## Heading`) before generating plain-text previews for the history list. The new regex `/^#{1,6}\s+.*$/gm` is applied before the existing bullet-stripping.

## Backward Compatibility

Legacy summaries stored without Markdown headings render correctly — `react-markdown` treats unformatted text as plain paragraphs, styled by the `p` component override.

## Design Tokens Used

| Token | Value | Usage |
|-------|-------|-------|
| `text-text-primary` | `#ffffff` | Body text |
| `text-text-secondary` | `#bbd1ea` | Emphasized/italic text |
| `text-text-muted` | `#848484` | Empty state placeholder |
| `auraHex` | Dynamic (workspace color) | Headings and bullet dots |
