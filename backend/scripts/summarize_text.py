"""
AI text summarization script.

Usage:
    echo "<text>" | python summarize_text.py <format> [chunk_size]

Reads text from stdin, summarizes it using distilbart-cnn-12-6 (with sumy
fallback), and prints the structured summary to stdout. Errors are written
to stderr and the process exits with code 1 on failure.

Formats:
    bullet   - Concise bullet-point list
    short    - Short paragraph overview
    detailed - In-depth multi-paragraph summary
"""

import sys
import io
import re
import warnings

warnings.filterwarnings("ignore")

# Force UTF-8 output on Windows (avoids 'charmap' codec errors)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

# ---------------------------------------------------------------------------
# Configuration per format
# ---------------------------------------------------------------------------

FORMAT_CONFIG = {
    "bullet": {"max_length": 80, "min_length": 20, "sentence_count": 6},
    "short": {"max_length": 150, "min_length": 40, "sentence_count": 4},
    "detailed": {"max_length": 300, "min_length": 80, "sentence_count": 10},
}

MAX_INPUT_WORDS = 50000  # safety cap


# ---------------------------------------------------------------------------
# Chunking
# ---------------------------------------------------------------------------

def chunk_text(text: str, chunk_size: int = 1024) -> list[str]:
    """Split *text* into chunks of roughly *chunk_size* words, breaking at
    sentence boundaries where possible."""
    sentences = re.split(r"(?<=[.!?])\s+", text)
    chunks: list[str] = []
    current: list[str] = []
    current_len = 0

    for sentence in sentences:
        words = len(sentence.split())
        if current_len + words > chunk_size and current:
            chunks.append(" ".join(current))
            current = []
            current_len = 0
        current.append(sentence)
        current_len += words

    if current:
        chunks.append(" ".join(current))

    return chunks if chunks else [text]


# ---------------------------------------------------------------------------
# Summarisation backends
# ---------------------------------------------------------------------------

def summarize_with_distilbart(chunks: list[str], cfg: dict) -> list[str]:
    """Abstractive summarization via distilbart-cnn-12-6."""
    from transformers import AutoTokenizer, AutoModelForSeq2SeqLM  # type: ignore

    model_name = "sshleifer/distilbart-cnn-12-6"
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

    summaries: list[str] = []
    for chunk in chunks:
        # Model needs a minimum input length
        if len(chunk.split()) < 10:
            summaries.append(chunk)
            continue

        inputs = tokenizer(
            chunk,
            return_tensors="pt",
            max_length=1024,
            truncation=True,
        )
        summary_ids = model.generate(
            inputs["input_ids"],
            max_length=cfg["max_length"],
            min_length=cfg["min_length"],
            do_sample=False,
            num_beams=4,
        )
        result = tokenizer.decode(summary_ids[0], skip_special_tokens=True)
        summaries.append(result)

    return summaries


def summarize_with_sumy(chunks: list[str], cfg: dict) -> list[str]:
    """Extractive fallback summarization via sumy LSA."""
    import nltk  # type: ignore

    # Ensure NLTK tokenizer data is available
    try:
        nltk.data.find("tokenizers/punkt_tab")
    except LookupError:
        nltk.download("punkt_tab", quiet=True)

    from sumy.parsers.plaintext import PlaintextParser  # type: ignore
    from sumy.nlp.tokenizers import Tokenizer  # type: ignore
    from sumy.summarizers.lsa import LsaSummarizer  # type: ignore

    summarizer = LsaSummarizer()
    summaries: list[str] = []

    for chunk in chunks:
        if len(chunk.split()) < 10:
            summaries.append(chunk)
            continue
        parser = PlaintextParser.from_string(chunk, Tokenizer("english"))
        result = summarizer(parser.document, cfg["sentence_count"])
        summaries.append(" ".join(str(s) for s in result))

    return summaries


# ---------------------------------------------------------------------------
# Output formatting
# ---------------------------------------------------------------------------

def format_output(summaries: list[str], fmt: str) -> str:
    """Post-process raw summaries into the requested format."""
    if fmt == "bullet":
        lines: list[str] = []
        for s in summaries:
            # Split on sentence boundaries to get individual bullets
            for part in re.split(r"(?<=[.!?])\s+", s.strip()):
                part = part.strip()
                if part:
                    lines.append(f"- {part}")
        return "\n".join(lines)

    if fmt == "short":
        return " ".join(s.strip() for s in summaries if s.strip())

    # detailed
    return "\n\n".join(s.strip() for s in summaries if s.strip())


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    if len(sys.argv) < 2:
        print(
            "Usage: echo '<text>' | python summarize_text.py <format> [chunk_size]",
            file=sys.stderr,
        )
        sys.exit(1)

    fmt = sys.argv[1]
    if fmt not in FORMAT_CONFIG:
        print(f"Unknown format '{fmt}'. Use: bullet, short, detailed", file=sys.stderr)
        sys.exit(1)

    chunk_size = int(sys.argv[2]) if len(sys.argv) > 2 else 1024
    cfg = FORMAT_CONFIG[fmt]

    text = sys.stdin.read().strip()
    if not text:
        print("No input text provided.", file=sys.stderr)
        sys.exit(1)

    # Safety cap
    word_count = len(text.split())
    if word_count > MAX_INPUT_WORDS:
        print(
            f"Input too large ({word_count} words, max {MAX_INPUT_WORDS}).",
            file=sys.stderr,
        )
        sys.exit(1)

    chunks = chunk_text(text, chunk_size)

    # --- Map phase ---
    try:
        raw_summaries = summarize_with_distilbart(chunks, cfg)
    except Exception as e:
        print(f"distilbart failed ({e}), falling back to sumy", file=sys.stderr)
        try:
            raw_summaries = summarize_with_sumy(chunks, cfg)
        except Exception as e2:
            print(f"sumy also failed: {e2}", file=sys.stderr)
            sys.exit(1)

    # --- Reduce phase ---
    if len(raw_summaries) > 3:
        combined = " ".join(raw_summaries)
        try:
            raw_summaries = summarize_with_distilbart([combined], cfg)
        except Exception:
            try:
                raw_summaries = summarize_with_sumy([combined], cfg)
            except Exception:
                pass  # keep map-phase results as-is

    output = format_output(raw_summaries, fmt)
    # Remove surrogate characters that can't be encoded to UTF-8
    output = output.encode("utf-8", errors="replace").decode("utf-8")
    print(output)


if __name__ == "__main__":
    main()
