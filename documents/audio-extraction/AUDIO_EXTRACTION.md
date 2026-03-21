# Audio Extraction — Whisper Integration

## Overview

EZY Notez supports automatic transcription of uploaded audio files using [OpenAI Whisper](https://github.com/openai/whisper), an open-source speech recognition model that runs locally (no API key required).

When a user uploads an audio file, the system:
1. Creates a resource record with `status: "uploading"`
2. Uploads the file to UploadThing
3. Sets `status: "indexing"` and triggers the backend extraction route
4. The backend spawns a Python child process running the Whisper `tiny` model
5. The transcript is saved to `extracted_text` and `status` is set to `"ready"`
6. On failure, `status` is set to `"failed"`

## Architecture

```
Frontend (Next.js)                    Backend (Express)                    Python Script
─────────────────                    ─────────────────                    ─────────────
Upload complete
  │
  ├─ POST /resources/:id/extract-audio
  │         │
  │         ├─ Set status = 'indexing'
  │         ├─ spawn('python', ['whisper_transcribe.py', fileUrl])
  │         │         │
  │         │         ├─ Download audio from URL
  │         │         ├─ Load Whisper tiny model
  │         │         ├─ Transcribe audio
  │         │         └─ Print transcript to stdout
  │         │
  │         ├─ Capture stdout (transcript)
  │         ├─ Save to extracted_text
  │         └─ Set status = 'ready'
  │
  └─ Update UI status
```

## Supported Audio Formats

| Format | MIME Type      | Extension |
|--------|---------------|-----------|
| MP3    | audio/mpeg    | .mp3      |
| WAV    | audio/wav     | .wav      |
| M4A    | audio/mp4     | .m4a      |
| WebM   | audio/webm    | .webm     |
| OGG    | audio/ogg     | .ogg      |

## Files

| File | Purpose |
|------|---------|
| `scripts/whisper_transcribe.py` | Standalone Python script that downloads audio and outputs transcript |
| `backend/src/services/resource.service.ts` | `extractAndStoreAudio()` — spawns the Python script and saves the result |
| `backend/src/controllers/resource.controller.ts` | `extractAudioHandler` — Express request handler |
| `backend/src/routes/resource.routes.ts` | `POST /:id/extract-audio` route |
| `frontend/src/lib/resources.ts` | `triggerAudioExtraction()` — frontend API call |
| `frontend/src/app/(dashboard)/workspaces/[slug]/page.tsx` | Upload completion handler with audio detection |
| `requirements.txt` | Python dependencies |

## Installation

### Prerequisites

- **Python 3.8+**
- **ffmpeg** — required by Whisper for audio decoding

### Local Development

1. Install ffmpeg:

   ```bash
   # macOS
   brew install ffmpeg

   # Ubuntu/Debian
   sudo apt-get install -y ffmpeg

   # Windows (via chocolatey)
   choco install ffmpeg
   ```

2. Install Python dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Verify Whisper works:

   ```bash
   python scripts/whisper_transcribe.py <any_audio_url>
   ```

### Testing the Script Standalone

```bash
python scripts/whisper_transcribe.py "https://example.com/sample.mp3"
```

The script will:
- Download the audio file
- Transcribe it using the Whisper `tiny` model
- Print the transcript to stdout
- Exit with code 0 on success, 1 on error

## Deployment (Railway / Render)

### Build Command

Add the following to your deployment build command to ensure `ffmpeg` and Python dependencies are available:

```bash
apt-get update && apt-get install -y ffmpeg python3 python3-pip && pip install -r requirements.txt
```

### Railway

In your Railway service settings, set the **Build Command** or use a `Dockerfile` / `nixpacks.toml`:

```toml
# nixpacks.toml
[phases.setup]
aptPkgs = ["ffmpeg", "python3", "python3-pip"]

[phases.install]
cmds = ["npm install", "pip install -r requirements.txt"]
```

### Render

In your Render service, update the **Build Command**:

```bash
apt-get update && apt-get install -y ffmpeg && pip install -r requirements.txt && npm install && npm run build
```

### Environment Notes

- The Whisper `tiny` model (~75MB) is downloaded automatically on first use and cached
- No API keys are required — Whisper runs entirely locally
- The `tiny` model is chosen for speed and low memory usage; it works well for clear speech
- For better accuracy on noisy audio, consider upgrading to `base` or `small` model (increase memory accordingly)

## Whisper Model Sizes

| Model  | Parameters | Required VRAM | Relative Speed |
|--------|-----------|---------------|----------------|
| tiny   | 39M       | ~1 GB         | ~32x           |
| base   | 74M       | ~1 GB         | ~16x           |
| small  | 244M      | ~2 GB         | ~6x            |
| medium | 769M      | ~5 GB         | ~2x            |
| large  | 1550M     | ~10 GB        | 1x             |

The project uses `tiny` by default for fast transcription with minimal resource requirements.
