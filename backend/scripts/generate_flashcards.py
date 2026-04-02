"""
Flashcard generation using Extractive NLP.

Usage:
    echo "<text>" | python generate_flashcards.py <count> [topic]

Reads text from stdin, generates question-answer flashcards using
TF-IDF sentence scoring, POS-tag-based subject extraction, and
pattern-matched question templates.  Prints a JSON array to stdout.
All diagnostics go to stderr.

Arguments:
    count  – number of flashcards to generate (clamped to 5-20)
    topic  – optional topic string to bias sentence selection
"""

import sys
import io
import json
import math
import re
import string
from collections import Counter
from typing import Optional

# Force UTF-8 on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
MAX_INPUT_WORDS = 30_000
MIN_INPUT_WORDS = 15
MIN_SENTENCE_WORDS = 8
MAX_SENTENCE_WORDS = 60
MAX_ANSWER_WORDS = 45
CANDIDATE_MULTIPLIER = 3

# ---------------------------------------------------------------------------
# NLTK bootstrap
# ---------------------------------------------------------------------------
_NLTK_RESOURCES = {
    "tokenizers/punkt_tab": "punkt_tab",
    "taggers/averaged_perceptron_tagger_eng": "averaged_perceptron_tagger_eng",
    "corpora/stopwords": "stopwords",
}


def _ensure_nltk_data() -> None:
    import nltk
    for path, name in _NLTK_RESOURCES.items():
        try:
            nltk.data.find(path)
        except LookupError:
            nltk.download(name, quiet=True)


try:
    _ensure_nltk_data()
except Exception as exc:
    print(f"Failed to download NLTK data: {exc}", file=sys.stderr)
    sys.exit(1)

import nltk  # noqa: E402
from nltk.tokenize import sent_tokenize, word_tokenize  # noqa: E402
from nltk.corpus import stopwords  # noqa: E402
from nltk.tag import pos_tag  # noqa: E402

STOP_WORDS = set(stopwords.words("english"))

# ---------------------------------------------------------------------------
# Text helpers
# ---------------------------------------------------------------------------

def _clean(text: str) -> str:
    """Collapse whitespace and strip non-ASCII noise."""
    return re.sub(r"\s+", " ", text).strip()


def _tokenize(text: str) -> list[str]:
    """Lowercase tokens without stopwords / punctuation / short words."""
    return [
        t for t in word_tokenize(text.lower())
        if t not in STOP_WORDS and t not in string.punctuation and len(t) > 2
    ]


def _sentences(text: str) -> list[str]:
    """Sentence-split and keep only those within a useful word-count range."""
    return [
        s.strip() for s in sent_tokenize(text)
        if MIN_SENTENCE_WORDS <= len(s.split()) <= MAX_SENTENCE_WORDS
    ]


# ---------------------------------------------------------------------------
# TF-IDF sentence scoring
# ---------------------------------------------------------------------------

def _tfidf_scores(sentences: list[str]) -> list[float]:
    n = len(sentences)
    if n == 0:
        return []

    token_lists = [_tokenize(s) for s in sentences]

    df: Counter[str] = Counter()
    for tokens in token_lists:
        for t in set(tokens):
            df[t] += 1

    idf = {t: math.log((n + 1) / (freq + 1)) + 1 for t, freq in df.items()}

    scores: list[float] = []
    for tokens in token_lists:
        if not tokens:
            scores.append(0.0)
            continue
        tf = Counter(tokens)
        scores.append(sum(tf[t] * idf.get(t, 0) for t in tf) / len(tokens))
    return scores


# ---------------------------------------------------------------------------
# Sentence classification
# ---------------------------------------------------------------------------

_SENTENCE_TYPES: list[tuple[str, list[re.Pattern[str]]]] = [
    ("definition", [
        re.compile(r"\b(?:is|are|was|were)\s+(?:a|an|the)\s+", re.I),
        re.compile(r"\b(?:is|are)\s+defined\s+as\b", re.I),
        re.compile(r"\b(?:refers?\s+to|known\s+as|called)\b", re.I),
        re.compile(r"\b(?:means?|represents?)\b", re.I),
    ]),
    ("cause_effect", [
        re.compile(r"\b(?:because|since|due\s+to|as\s+a\s+result|therefore|consequently|leads?\s+to|causes?|results?\s+in)\b", re.I),
    ]),
    ("process", [
        re.compile(r"\b(?:first|then|next|finally|step|process|procedure|method|involves?|begins?\s+with|starts?\s+with)\b", re.I),
    ]),
    ("comparison", [
        re.compile(r"\b(?:however|whereas|unlike|in\s+contrast|compared\s+to|differs?\s+from|similar\s+to|on\s+the\s+other\s+hand)\b", re.I),
    ]),
    ("example", [
        re.compile(r"\b(?:for\s+example|for\s+instance|such\s+as|e\.g\.|including)\b", re.I),
    ]),
    ("purpose", [
        re.compile(r"\b(?:in\s+order\s+to|so\s+that|used\s+(?:to|for)|purpose|aim|goal|function|role)\b", re.I),
    ]),
]

_TYPE_BONUS: dict[str, float] = {
    "definition": 2.0,
    "cause_effect": 1.5,
    "process": 1.5,
    "comparison": 1.3,
    "purpose": 1.3,
    "example": 0.8,
    "general": 1.0,
}


def _classify(sentence: str) -> str:
    for label, patterns in _SENTENCE_TYPES:
        if any(p.search(sentence) for p in patterns):
            return label
    return "general"


# ---------------------------------------------------------------------------
# Subject extraction
# ---------------------------------------------------------------------------

_LEADING_PHRASE = re.compile(
    r"^(?:for\s+example|for\s+instance|however|moreover|furthermore|"
    r"in\s+addition|additionally|therefore|consequently|thus|hence|"
    r"in\s+fact|unlike|similarly|in\s+contrast)[,;:\s]*",
    re.I,
)

_DETERMINERS = {"the", "a", "an", "this", "that", "these", "those"}


def _extract_subject(sentence: str) -> str:
    """Return the main subject noun phrase from *sentence*."""
    cleaned = _LEADING_PHRASE.sub("", sentence).strip() or sentence
    parts: list[str] = []

    for word, tag in pos_tag(word_tokenize(cleaned)):
        if tag.startswith("VB"):
            break
        if tag.startswith(("NN", "JJ", "DT", "PRP")):
            parts.append(word)
        elif parts and tag in ("IN", "CC"):
            break

    # Drop leading determiners
    while parts and parts[0].lower() in _DETERMINERS:
        parts.pop(0)

    if parts:
        return " ".join(parts)

    # Fallback: first meaningful words
    words = [w for w in cleaned.split()[:5] if w.lower() not in STOP_WORDS]
    return " ".join(words[:3]) if words else "this concept"


# ---------------------------------------------------------------------------
# Question templates
# ---------------------------------------------------------------------------

_TEMPLATES: dict[str, list[str]] = {
    "definition": [
        "What is {s}?",
        "How would you define {s}?",
        "What does {s} refer to?",
    ],
    "cause_effect": [
        "What causes or leads to the effect described regarding {s}?",
        "What is the result or consequence related to {s}?",
        "Why does {s} occur?",
    ],
    "process": [
        "What is the process involving {s}?",
        "How does {s} work?",
        "What are the steps related to {s}?",
    ],
    "comparison": [
        "What is the key difference or contrast mentioned about {s}?",
        "How is {s} distinguished from related concepts?",
    ],
    "example": [
        "What is an example related to {s}?",
        "Can you give an example of {s}?",
    ],
    "purpose": [
        "What is the purpose or function of {s}?",
        "Why is {s} important?",
        "What role does {s} play?",
    ],
    "general": [
        "What is important to know about {s}?",
        "Explain the concept of {s}.",
        "What should you know about {s}?",
    ],
}


def _make_question(sentence: str, stype: str) -> str:
    subject = _extract_subject(sentence)
    templates = _TEMPLATES.get(stype, _TEMPLATES["general"])
    return templates[hash(sentence) % len(templates)].format(s=subject)


# ---------------------------------------------------------------------------
# Answer builder
# ---------------------------------------------------------------------------

def _make_answer(sentence: str, neighbours: list[str]) -> str:
    answer = sentence.strip()
    if len(answer.split()) < 15:
        for ctx in neighbours:
            if ctx != sentence and len(ctx.split()) >= MIN_SENTENCE_WORDS:
                combined = f"{answer} {ctx.strip()}"
                if len(combined.split()) <= MAX_ANSWER_WORDS:
                    answer = combined
                break
    return answer


# ---------------------------------------------------------------------------
# Topic scoring
# ---------------------------------------------------------------------------

def _topic_score(sentence: str, topic: str) -> float:
    slow = sentence.lower()
    tlow = topic.lower()
    twords = set(tlow.split())

    score = 5.0 if tlow in slow else 0.0
    score += sum(1.5 for w in twords if w in slow)
    score += sum(0.5 for w in twords if len(w) > 4 and w[:-2] in slow)
    return score


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------

def generate_flashcards(
    text: str, count: int, topic: Optional[str] = None
) -> list[dict[str, str]]:
    text = _clean(text)
    sentences = _sentences(text)
    if not sentences:
        raise ValueError("No usable sentences found in the input text.")

    print(f"  Extracted {len(sentences)} candidate sentences", file=sys.stderr)

    # Score every sentence
    tfidf = _tfidf_scores(sentences)
    ranked: list[tuple[float, int, str]] = []

    for i, sent in enumerate(sentences):
        stype = _classify(sent)
        bonus = _TYPE_BONUS.get(stype, 1.0)
        tscore = _topic_score(sent, topic) * 2.0 if topic else 0.0
        ranked.append((tfidf[i] * bonus + tscore, i, stype))

    ranked.sort(key=lambda x: x[0], reverse=True)

    # Build cards from top candidates
    cards: list[dict[str, str]] = []
    used_subjects: set[str] = set()

    for _score, idx, stype in ranked[: count * CANDIDATE_MULTIPLIER]:
        if len(cards) >= count:
            break

        sent = sentences[idx]
        subj = _extract_subject(sent).lower()

        # Deduplicate by subject overlap
        if any(subj in u or u in subj for u in used_subjects if len(u) > 3):
            continue

        question = _make_question(sent, stype)
        if len(question.split()) < 4:
            continue

        neighbours = []
        if idx > 0:
            neighbours.append(sentences[idx - 1])
        if idx < len(sentences) - 1:
            neighbours.append(sentences[idx + 1])
        answer = _make_answer(sent, neighbours)
        if len(answer.split()) < 5:
            continue

        # Reject near-duplicate Q/A content
        qw, aw = set(_tokenize(question)), set(_tokenize(answer))
        if qw and aw and len(qw & aw) / max(len(qw), 1) > 0.8:
            continue

        cards.append({"front": question, "back": answer})
        used_subjects.add(subj)
        print(f"  Card {len(cards)}/{count} [{stype}]", file=sys.stderr)

    if not cards:
        raise ValueError("Could not produce any valid flashcards from the input.")
    return cards


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main() -> None:
    if len(sys.argv) < 2:
        print(
            "Usage: echo '<text>' | python generate_flashcards.py <count> [topic]",
            file=sys.stderr,
        )
        sys.exit(1)

    try:
        count = max(5, min(20, int(sys.argv[1])))
    except ValueError:
        print(f"Invalid count '{sys.argv[1]}'. Expected an integer (5-20).", file=sys.stderr)
        sys.exit(1)

    topic = sys.argv[2] if len(sys.argv) > 2 else None

    text = sys.stdin.read().strip()
    if not text:
        print("No input text provided on stdin.", file=sys.stderr)
        sys.exit(1)

    wc = len(text.split())
    if wc > MAX_INPUT_WORDS:
        print(f"Input too large ({wc} words, max {MAX_INPUT_WORDS}).", file=sys.stderr)
        sys.exit(1)
    if wc < MIN_INPUT_WORDS:
        print(f"Input too short ({wc} words, min {MIN_INPUT_WORDS}).", file=sys.stderr)
        sys.exit(1)

    print(f"Processing {wc} words, generating {count} flashcards...", file=sys.stderr)
    if topic:
        print(f"Topic focus: {topic}", file=sys.stderr)

    try:
        cards = generate_flashcards(text, count, topic)
        print(json.dumps(cards, ensure_ascii=False, indent=2))
        print(f"Successfully generated {len(cards)} flashcards.", file=sys.stderr)
    except (ValueError, RuntimeError) as exc:
        print(f"Flashcard generation failed: {exc}", file=sys.stderr)
        sys.exit(1)
    except Exception as exc:
        print(f"Unexpected error during generation: {exc}", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
