"""
Standalone Whisper transcription script.

Usage:
    python whisper_transcribe.py <audio_file_url>

Downloads the audio file from the given URL, transcribes it using
OpenAI Whisper (tiny model), and prints the transcript to stdout.
"""

import sys
import os
import tempfile
import requests
import whisper


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: python whisper_transcribe.py <audio_file_url>", file=sys.stderr)
        sys.exit(1)

    file_url = sys.argv[1]
    tmp_path = None

    try:
        # Download audio file to a temporary location
        response = requests.get(file_url, timeout=120)
        response.raise_for_status()

        # Determine file extension from Content-Type or URL
        content_type = response.headers.get("Content-Type", "")
        ext_map = {
            "audio/mpeg": ".mp3",
            "audio/wav": ".wav",
            "audio/x-wav": ".wav",
            "audio/mp4": ".m4a",
            "audio/m4a": ".m4a",
            "audio/x-m4a": ".m4a",
            "audio/webm": ".webm",
            "audio/ogg": ".ogg",
        }
        ext = ext_map.get(content_type, ".mp3")

        # Write to temp file
        fd, tmp_path = tempfile.mkstemp(suffix=ext)
        with os.fdopen(fd, "wb") as f:
            f.write(response.content)

        # Load Whisper model and transcribe
        model = whisper.load_model("tiny")
        result = model.transcribe(tmp_path)

        # Print ONLY the transcript text to stdout
        print(result["text"])

    except requests.RequestException as e:
        print(f"Failed to download audio file: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Transcription failed: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        # Clean up temp file
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


if __name__ == "__main__":
    main()
