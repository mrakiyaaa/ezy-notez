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

MAX_INPUT_WORDS = 50_000
MIN_WORDS_FOR_SUMMARIZATION = 10
REDUCE_THRESHOLD = 3

MODEL_NAME = "sshleifer/distilbart-cnn-12-6"
MODEL_MAX_INPUT_TOKENS = 1024


# ---------------------------------------------------------------------------
# Chunking
# ---------------------------------------------------------------------------

def chunk_text(text: str, chunk_size: int = 1024) -> list[str]:
    """Split *text* into chunks of roughly *chunk_size* words, breaking at
    sentence boundaries where possible."""
    sentences = re.split(r"(?<=[.!?])\s+", text)
    chunks: list[str] = []
    current_sentences: list[str] = []
    current_word_count = 0

    for sentence in sentences:
        sentence_word_count = len(sentence.split())
        if current_word_count + sentence_word_count > chunk_size and current_sentences:
            chunks.append(" ".join(current_sentences))
            current_sentences = []
            current_word_count = 0
        current_sentences.append(sentence)
        current_word_count += sentence_word_count

    if current_sentences:
        chunks.append(" ".join(current_sentences))

    return chunks if chunks else [text]


# ---------------------------------------------------------------------------
# Summarisation backends
# ---------------------------------------------------------------------------

def summarize_with_distilbart(chunks: list[str], config: dict) -> list[str]:
    """Abstractive summarization via distilbart-cnn-12-6."""
    try:
        from transformers import AutoTokenizer, AutoModelForSeq2SeqLM  # type: ignore
    except ImportError as import_err:
        raise RuntimeError(
            f"Required package 'transformers' is not installed: {import_err}"
        ) from import_err

    try:
        tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME)
    except Exception as load_err:
        raise RuntimeError(
            f"Failed to load model '{MODEL_NAME}': {load_err}"
        ) from load_err

    summaries: list[str] = []
    for chunk in chunks:
        if len(chunk.split()) < MIN_WORDS_FOR_SUMMARIZATION:
            summaries.append(chunk)
            continue

        try:
            inputs = tokenizer(
                chunk,
                return_tensors="pt",
                max_length=MODEL_MAX_INPUT_TOKENS,
                truncation=True,
            )
            summary_ids = model.generate(
                inputs["input_ids"],
                max_length=config["max_length"],
                min_length=config["min_length"],
                do_sample=False,
                num_beams=4,
            )
            decoded_summary = tokenizer.decode(
                summary_ids[0], skip_special_tokens=True
            )
            summaries.append(decoded_summary)
        except MemoryError as mem_err:
            raise RuntimeError(
                f"Out of memory while summarizing chunk ({len(chunk.split())} words): {mem_err}"
            ) from mem_err

    return summaries


def summarize_with_sumy(chunks: list[str], config: dict) -> list[str]:
    """Extractive fallback summarization via sumy LSA."""
    try:
        import nltk  # type: ignore
    except ImportError as import_err:
        raise RuntimeError(
            f"Required package 'nltk' is not installed: {import_err}"
        ) from import_err

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
        if len(chunk.split()) < MIN_WORDS_FOR_SUMMARIZATION:
            summaries.append(chunk)
            continue
        parser = PlaintextParser.from_string(chunk, Tokenizer("english"))
        extracted_sentences = summarizer(parser.document, config["sentence_count"])
        summaries.append(" ".join(str(sentence) for sentence in extracted_sentences))

    return summaries


# ---------------------------------------------------------------------------
# Output formatting
# ---------------------------------------------------------------------------

def format_output(summaries: list[str], fmt: str) -> str:
    """Post-process raw summaries into the requested format (Markdown)."""
    if fmt == "bullet":
        bullet_lines: list[str] = []
        for summary in summaries:
            for sentence in re.split(r"(?<=[.!?])\s+", summary.strip()):
                sentence = sentence.strip()
                if sentence:
                    bullet_lines.append(f"- {sentence}")
        return "## Key Points\n\n" + "\n".join(bullet_lines)

    if fmt == "short":
        paragraph = " ".join(
            summary.strip() for summary in summaries if summary.strip()
        )
        return "## Summary\n\n" + paragraph

    # detailed
    paragraphs = "\n\n".join(
        summary.strip() for summary in summaries if summary.strip()
    )
    return "## Detailed Summary\n\n" + paragraphs


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
        print(
            f"Unknown format '{fmt}'. Expected one of: bullet, short, detailed",
            file=sys.stderr,
        )
        sys.exit(1)

    chunk_size = int(sys.argv[2]) if len(sys.argv) > 2 else 1024
    config = FORMAT_CONFIG[fmt]

    text = sys.stdin.read().strip()
    if not text:
        print("No input text provided on stdin.", file=sys.stderr)
        sys.exit(1)

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
        chunk_summaries = summarize_with_distilbart(chunks, config)
    except Exception as distilbart_error:
        print(
            f"distilbart failed ({distilbart_error}), falling back to sumy",
            file=sys.stderr,
        )
        try:
            chunk_summaries = summarize_with_sumy(chunks, config)
        except Exception as sumy_error:
            print(
                f"Both summarization backends failed. "
                f"distilbart: {distilbart_error} | sumy: {sumy_error}",
                file=sys.stderr,
            )
            sys.exit(1)

    # --- Reduce phase: consolidate many chunks into a single summary ---
    if len(chunk_summaries) > REDUCE_THRESHOLD:
        combined_text = " ".join(chunk_summaries)
        try:
            chunk_summaries = summarize_with_distilbart([combined_text], config)
        except Exception as reduce_distilbart_error:
            print(
                f"Reduce phase distilbart failed ({reduce_distilbart_error}), "
                f"trying sumy fallback",
                file=sys.stderr,
            )
            try:
                chunk_summaries = summarize_with_sumy([combined_text], config)
            except Exception as reduce_sumy_error:
                # Keep map-phase results — better than nothing
                print(
                    f"Reduce phase failed entirely (distilbart: {reduce_distilbart_error}, "
                    f"sumy: {reduce_sumy_error}), using map-phase results",
                    file=sys.stderr,
                )

    output = format_output(chunk_summaries, fmt)
    # Remove surrogate characters that can't be encoded to UTF-8
    output = output.encode("utf-8", errors="replace").decode("utf-8")
    print(output)


if __name__ == "__main__":
    main()
