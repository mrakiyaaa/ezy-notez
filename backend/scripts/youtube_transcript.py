"""
Standalone YouTube transcript extraction script.

Usage:
    python youtube_transcript.py <youtube_url>

Extracts the transcript (captions/subtitles) from a YouTube video using
youtube-transcript-api v1.x. The first line of output is TITLE:<video title>,
followed by the transcript text. Errors are written to stderr and the
process exits with code 1 on failure.
"""

import sys
import io
import re
import requests
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import NoTranscriptFound, TranscriptsDisabled, VideoUnavailable

# Force UTF-8 output on Windows (avoids 'charmap' codec errors with Unicode text)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")


def parse_video_id(url: str) -> str | None:
    """Extract YouTube video ID from various URL formats."""
    patterns = [
        r"(?:youtube\.com\/watch\?.*v=)([\w-]{11})",
        r"(?:youtu\.be\/)([\w-]{11})",
        r"(?:youtube\.com\/embed\/)([\w-]{11})",
        r"(?:youtube\.com\/shorts\/)([\w-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def fetch_video_title(url: str) -> str:
    """Fetch video title by parsing the YouTube page HTML."""
    try:
        resp = requests.get(url, timeout=15, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        })
        match = re.search(r"<title>(.*?)</title>", resp.text)
        if match:
            title = match.group(1).replace(" - YouTube", "").strip()
            if title:
                return title
    except Exception:
        pass
    return "YouTube Video"


def fetch_transcript(video_id: str) -> str:
    """Fetch transcript text using youtube-transcript-api v1.x instance API."""
    api = YouTubeTranscriptApi()

    try:
        # Try English first (manually created, then auto-generated)
        transcript_list = api.list(video_id)

        try:
            transcript = transcript_list.find_manually_created_transcript(["en"])
            fetched = transcript.fetch()
            return " ".join(s.text for s in fetched.snippets)
        except NoTranscriptFound:
            pass

        try:
            transcript = transcript_list.find_generated_transcript(["en"])
            fetched = transcript.fetch()
            return " ".join(s.text for s in fetched.snippets)
        except NoTranscriptFound:
            pass

        # Fall back to any available language
        for transcript in transcript_list:
            fetched = transcript.fetch()
            return " ".join(s.text for s in fetched.snippets)

    except (TranscriptsDisabled, VideoUnavailable):
        raise
    except Exception:
        pass

    # Direct fetch fallback (default English)
    fetched = api.fetch(video_id)
    return " ".join(s.text for s in fetched.snippets)


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: python youtube_transcript.py <youtube_url>", file=sys.stderr)
        sys.exit(1)

    youtube_url = sys.argv[1]

    # Parse video ID
    video_id = parse_video_id(youtube_url)
    if not video_id:
        print(f"Could not parse video ID from URL: {youtube_url}", file=sys.stderr)
        sys.exit(1)

    try:
        # Fetch title
        title = fetch_video_title(youtube_url)

        # Fetch transcript
        transcript = fetch_transcript(video_id)

        if not transcript.strip():
            print("No transcript content found for this video.", file=sys.stderr)
            sys.exit(1)

        # Output: first line is TITLE, then blank line, then transcript
        print(f"TITLE:{title}")
        print()
        print(transcript)

    except TranscriptsDisabled:
        print("Transcripts are disabled for this video.", file=sys.stderr)
        sys.exit(1)
    except VideoUnavailable:
        print("Video is unavailable or private.", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"YouTube transcript extraction failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
