# YouTube Transcript Extraction

## Overview

EzyNotez supports extracting transcripts from YouTube videos. Users paste a YouTube URL into the Resources view, and the system fetches the video's captions/subtitles using `youtube-transcript-api`. The transcript is stored in the database and made available for AI-powered features (summaries, flashcards, quizzes).

Unlike file-based resources (PDF, PPTX, audio), YouTube resources are URL-based — no file upload to UploadThing is involved.

---

## Architecture

```
Frontend (Next.js)                   Backend (Express)                    Python Script
------------------                   -----------------                    -------------
User pastes YouTube URL
  |
  +-- createYoutubeResource()
  |   POST /api/resources/youtube
  |         |
  |         +-- Validate URL (regex)
  |         +-- insertResource() → status='indexing'
  |         +-- Return resource (201)
  |         |
  |         +-- extractAndStoreYoutube() [background]
  |               |
  |               +-- spawnPythonScript(youtube_transcript.py, url)
  |                         |
  |                         +-- Parse video ID from URL
  |                         +-- Fetch transcript (youtube-transcript-api)
  |                         +-- Fetch video title (HTTP + regex)
  |                         +-- Print TITLE:<title>\n\n<transcript> to stdout
  |               |
  |               +-- Parse TITLE: prefix → update resource name
  |               +-- Store transcript in extracted_text
  |               +-- Set status = 'ready' (or 'failed' on error)
  |
  +-- Polls getWorkspaceResources() every 3s
      until no resources are in 'indexing' state
```

---

## Supported URL Formats

| Format | Example |
|--------|---------|
| Standard watch URL | `https://www.youtube.com/watch?v=dQw4w9WgXcQ` |
| Short URL | `https://youtu.be/dQw4w9WgXcQ` |
| Embed URL | `https://www.youtube.com/embed/dQw4w9WgXcQ` |
| Shorts URL | `https://www.youtube.com/shorts/dQw4w9WgXcQ` |
| With extra params | `https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30` |

---

## Files

| File | Purpose |
|------|---------|
| `backend/scripts/youtube_transcript.py` | Python script that extracts transcript and title |
| `backend/src/services/resource.service.ts` | `extractAndStoreYoutube()` — orchestrates extraction pipeline |
| `backend/src/controllers/resource.controller.ts` | `createYoutubeResourceHandler`, `extractYoutubeHandler` |
| `backend/src/routes/resource.routes.ts` | `POST /youtube`, `POST /:id/extract-youtube` |
| `frontend/src/services/resource.service.ts` | `createYoutubeResource()`, `triggerYoutubeExtraction()` |
| `frontend/src/components/workspace/ResourcesView.tsx` | YouTube URL input UI + polling logic |
| `frontend/src/components/workspace/ResourceItem.tsx` | YouTube resource display (icon, "YouTube" label) |

---

## API Endpoints

### `POST /api/resources/youtube`

Creates a YouTube resource and triggers background transcript extraction.

**Request body:**
```json
{
  "workspace_id": "uuid",
  "youtube_url": "https://www.youtube.com/watch?v=...",
  "name": "optional override name"
}
```

**Response (201):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "YouTube Video",
    "url": "https://www.youtube.com/watch?v=...",
    "type": "youtube",
    "status": "indexing",
    ...
  }
}
```

The resource name is updated automatically to the video title once extraction completes.

### `POST /api/resources/:id/extract-youtube`

Re-triggers transcript extraction for an existing YouTube resource (e.g., to retry a failed extraction).

**Request body:**
```json
{ "fileUrl": "https://www.youtube.com/watch?v=..." }
```

---

## Installation

Add `youtube-transcript-api` to `requirements.txt` (already done) and install:

```bash
pip install youtube-transcript-api
```

---

## Testing the Script Standalone

```bash
# Normal video with captions
python backend/scripts/youtube_transcript.py "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

# Expected output:
# TITLE:Rick Astley - Never Gonna Give You Up (Official Video)
#
# [transcript text...]

# Error cases — should print to stderr and exit 1
python backend/scripts/youtube_transcript.py "not-a-url"
python backend/scripts/youtube_transcript.py "https://www.youtube.com/watch?v=INVALIDID123"
```

---

## Transcript Priority

The script attempts to find a transcript in this order:

1. Manually created English transcript
2. Auto-generated English transcript
3. Any available language (first available)
4. Direct fetch fallback (defaults to English)

---

## Limitations

- Videos with no captions or subtitles of any kind will fail (status → `failed`)
- Private or unavailable videos will fail
- Age-restricted videos may fail depending on the environment
- Auto-generated transcripts may contain errors or incorrect punctuation
- Video title fetch relies on parsing YouTube page HTML; may occasionally fall back to "YouTube Video"

---

## Dependency

| Package | Version | Purpose |
|---------|---------|---------|
| `youtube-transcript-api` | ≥1.2.4 | Fetch captions/subtitles via YouTube's internal API |

No system-level dependencies (unlike Whisper which requires ffmpeg).
