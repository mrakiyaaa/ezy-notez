"""
Flashcard generation using Extractive NLP (no external APIs or large models).

Usage:
    echo "<text>" | python generate_flashcards.py <count> [topic]

Reads text from stdin, generates question-answer flashcards using
sentence scoring, keyword extraction, and pattern-based question
generation. Prints JSON array to stdout.

Arguments:
    count   - Number of flashcards to generate (5-20)
    topic   - Optional topic focus to filter/guide generation
"""

import sys
import io
import json
import math
import re
import string
from collections import Counter
from typing import Optional

# Force UTF-8 output on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

MAX_INPUT_WORDS = 30_000
MIN_CHUNK_WORDS = 15

# ---------------------------------------------------------------------------
# NLTK bootstrap — download required data once
# ---------------------------------------------------------------------------

def _ensure_nltk_data() -> None:
    import nltk
    for resource in ["punkt_tab", "averaged_perceptron_tagger_eng", "stopwords"]:
        try:
            nltk.data.find(f"tokenizers/{resource}" if "punkt" in resource else f"taggers/{resource}" if "tagger" in resource else f"corpora/{resource}")
        except LookupError:
            nltk.download(resource, quiet=True)

_ensure_nltk_data()

import nltk
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.corpus import stopwords
from nltk.tag import pos_tag

STOP_WORDS = set(stopwords.words("english"))

# ---------------------------------------------------------------------------
# Text analysis helpers
# ---------------------------------------------------------------------------

def clean_text(text: str) -> str:
    """Normalize whitespace and remove artifacts."""
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'[^\x00-\x7F]+', ' ', text)  # Remove non-ASCII
    return text.strip()


def get_sentences(text: str) -> list[str]:
    """Split text into sentences, filtering out very short/long ones."""
    raw = sent_tokenize(text)
    sentences: list[str] = []
    for s in raw:
        s = s.strip()
        word_count = len(s.split())
        # Keep sentences between 8 and 60 words
        if 8 <= word_count <= 60:
            sentences.append(s)
    return sentences


def tokenize_lower(text: str) -> list[str]:
    """Tokenize and lowercase, removing stopwords and punctuation."""
    tokens = word_tokenize(text.lower())
    return [t for t in tokens if t not in STOP_WORDS and t not in string.punctuation and len(t) > 2]


# ---------------------------------------------------------------------------
# TF-IDF sentence scoring
# ---------------------------------------------------------------------------

def compute_tfidf_scores(sentences: list[str]) -> list[float]:
    """Score each sentence by TF-IDF importance."""
    if not sentences:
        return []

    # Tokenize each sentence
    sentence_tokens = [tokenize_lower(s) for s in sentences]

    # Document frequency
    num_sentences = len(sentences)
    df: Counter = Counter()
    for tokens in sentence_tokens:
        unique_tokens = set(tokens)
        for t in unique_tokens:
            df[t] += 1

    # Compute IDF
    idf: dict[str, float] = {}
    for term, freq in df.items():
        idf[term] = math.log((num_sentences + 1) / (freq + 1)) + 1

    # Score each sentence as average TF-IDF of its tokens
    scores: list[float] = []
    for tokens in sentence_tokens:
        if not tokens:
            scores.append(0.0)
            continue
        tf = Counter(tokens)
        score = sum(tf[t] * idf.get(t, 0) for t in tf) / len(tokens)
        scores.append(score)

    return scores


# ---------------------------------------------------------------------------
# Key term extraction
# ---------------------------------------------------------------------------

def extract_key_terms(sentences: list[str], top_n: int = 30) -> list[str]:
    """Extract key noun phrases and important terms from text."""
    all_tokens = []
    for s in sentences:
        all_tokens.extend(tokenize_lower(s))

    # Frequency-based importance
    freq = Counter(all_tokens)

    # Also extract noun phrases using POS tagging
    noun_phrases: list[str] = []
    for s in sentences:
        tagged = pos_tag(word_tokenize(s))
        current_np: list[str] = []
        for word, tag in tagged:
            if tag.startswith(("NN", "JJ")):  # Nouns and adjectives
                current_np.append(word)
            else:
                if len(current_np) >= 2:
                    noun_phrases.append(" ".join(current_np).lower())
                current_np = []
        if len(current_np) >= 2:
            noun_phrases.append(" ".join(current_np).lower())

    np_freq = Counter(noun_phrases)

    # Combine: single terms + noun phrases
    combined: Counter = Counter()
    for term, count in freq.most_common(top_n * 2):
        combined[term] = count
    for np_term, count in np_freq.most_common(top_n):
        combined[np_term] = count * 3  # Boost noun phrases

    return [term for term, _ in combined.most_common(top_n)]


# ---------------------------------------------------------------------------
# Sentence classification — detect what kind of info a sentence conveys
# ---------------------------------------------------------------------------

_DEFINITION_PATTERNS = [
    re.compile(r'\b(?:is|are|was|were)\s+(?:a|an|the)\s+', re.I),
    re.compile(r'\b(?:is|are)\s+defined\s+as\b', re.I),
    re.compile(r'\b(?:refers?\s+to|known\s+as|called)\b', re.I),
    re.compile(r'\b(?:means?|represents?)\b', re.I),
]

_CAUSE_EFFECT_PATTERNS = [
    re.compile(r'\b(?:because|since|due\s+to|as\s+a\s+result|therefore|consequently|leads?\s+to|causes?|results?\s+in)\b', re.I),
]

_PROCESS_PATTERNS = [
    re.compile(r'\b(?:first|then|next|finally|step|process|procedure|method|involves?|begins?\s+with|starts?\s+with)\b', re.I),
]

_COMPARISON_PATTERNS = [
    re.compile(r'\b(?:however|whereas|unlike|in\s+contrast|compared\s+to|differs?\s+from|similar\s+to|on\s+the\s+other\s+hand)\b', re.I),
]

_EXAMPLE_PATTERNS = [
    re.compile(r'\b(?:for\s+example|for\s+instance|such\s+as|e\.g\.|including)\b', re.I),
]

_PURPOSE_PATTERNS = [
    re.compile(r'\b(?:in\s+order\s+to|so\s+that|used\s+(?:to|for)|purpose|aim|goal|function|role)\b', re.I),
]


def classify_sentence(sentence: str) -> str:
    """Classify sentence type to generate appropriate question."""
    for p in _DEFINITION_PATTERNS:
        if p.search(sentence):
            return "definition"
    for p in _CAUSE_EFFECT_PATTERNS:
        if p.search(sentence):
            return "cause_effect"
    for p in _PROCESS_PATTERNS:
        if p.search(sentence):
            return "process"
    for p in _COMPARISON_PATTERNS:
        if p.search(sentence):
            return "comparison"
    for p in _EXAMPLE_PATTERNS:
        if p.search(sentence):
            return "example"
    for p in _PURPOSE_PATTERNS:
        if p.search(sentence):
            return "purpose"
    return "general"


# ---------------------------------------------------------------------------
# Question generation from sentence
# ---------------------------------------------------------------------------

_LEADING_PHRASES = re.compile(
    r'^(?:for\s+example|for\s+instance|however|moreover|furthermore|in\s+addition|'
    r'additionally|therefore|consequently|thus|hence|in\s+fact|'
    r'unlike|similarly|in\s+contrast)[,;:\s]*',
    re.I,
)


def extract_subject(sentence: str) -> str:
    """Extract the main subject (first noun phrase) from a sentence."""
    # Strip leading transitional phrases
    cleaned = _LEADING_PHRASES.sub('', sentence).strip()
    if not cleaned:
        cleaned = sentence

    tagged = pos_tag(word_tokenize(cleaned))
    subject_parts: list[str] = []

    for word, tag in tagged:
        if tag.startswith("VB"):
            break
        if tag.startswith(("NN", "JJ", "DT", "PRP")):
            subject_parts.append(word)
        elif subject_parts and tag in ("IN", "CC"):
            break

    if subject_parts:
        # Remove leading determiners for cleaner subject
        while subject_parts and subject_parts[0].lower() in ("the", "a", "an", "this", "that", "these", "those"):
            subject_parts.pop(0)
        if subject_parts:
            return " ".join(subject_parts)

    # Fallback: first few meaningful words
    words = [w for w in cleaned.split()[:5] if w.lower() not in STOP_WORDS]
    return " ".join(words[:3]) if words else "this concept"


def generate_question(sentence: str, sentence_type: str) -> str:
    """Generate a question based on sentence content and type."""
    subject = extract_subject(sentence)

    if sentence_type == "definition":
        templates = [
            f"What is {subject}?",
            f"How would you define {subject}?",
            f"What does {subject} refer to?",
        ]
    elif sentence_type == "cause_effect":
        templates = [
            f"What causes or leads to the effect described regarding {subject}?",
            f"What is the result or consequence related to {subject}?",
            f"Why does {subject} occur?",
        ]
    elif sentence_type == "process":
        templates = [
            f"What is the process involving {subject}?",
            f"How does {subject} work?",
            f"What are the steps related to {subject}?",
        ]
    elif sentence_type == "comparison":
        templates = [
            f"What is the key difference or contrast mentioned about {subject}?",
            f"How is {subject} distinguished from related concepts?",
        ]
    elif sentence_type == "example":
        templates = [
            f"What is an example related to {subject}?",
            f"Can you give an example of {subject}?",
        ]
    elif sentence_type == "purpose":
        templates = [
            f"What is the purpose or function of {subject}?",
            f"Why is {subject} important?",
            f"What role does {subject} play?",
        ]
    else:
        templates = [
            f"What is important to know about {subject}?",
            f"Explain the concept of {subject}.",
            f"What should you know about {subject}?",
        ]

    # Pick template based on hash of sentence (deterministic but varied)
    idx = hash(sentence) % len(templates)
    return templates[idx]


# ---------------------------------------------------------------------------
# Answer generation
# ---------------------------------------------------------------------------

def generate_answer(sentence: str, context_sentences: list[str]) -> str:
    """Build an answer from the key sentence + nearby context."""
    answer = sentence.strip()

    # If the sentence is short, try to add context from neighbors
    if len(answer.split()) < 15 and context_sentences:
        for ctx in context_sentences:
            if ctx != sentence and len(ctx.split()) >= 8:
                combined = f"{answer} {ctx.strip()}"
                if len(combined.split()) <= 45:
                    answer = combined
                break

    return answer


# ---------------------------------------------------------------------------
# Topic filtering
# ---------------------------------------------------------------------------

def score_sentence_for_topic(sentence: str, topic: str) -> float:
    """Score how relevant a sentence is to the given topic."""
    sentence_lower = sentence.lower()
    topic_lower = topic.lower()
    topic_words = set(topic_lower.split())

    score = 0.0

    # Exact phrase match
    if topic_lower in sentence_lower:
        score += 5.0

    # Individual word matches
    for word in topic_words:
        if word in sentence_lower:
            score += 1.5

    # Partial word matches (stems)
    for word in topic_words:
        if len(word) > 4:
            stem = word[:len(word) - 2]
            if stem in sentence_lower:
                score += 0.5

    return score


# ---------------------------------------------------------------------------
# Main generation pipeline
# ---------------------------------------------------------------------------

def generate_flashcards(text: str, count: int, topic: Optional[str] = None) -> list[dict]:
    """Generate flashcards using extractive NLP techniques."""

    text = clean_text(text)
    sentences = get_sentences(text)

    if not sentences:
        raise ValueError("No meaningful sentences found in input text")

    print(f"  Found {len(sentences)} valid sentences", file=sys.stderr)

    # --- Score sentences ---
    tfidf_scores = compute_tfidf_scores(sentences)

    # Topic scoring
    topic_scores = [0.0] * len(sentences)
    if topic:
        topic_scores = [score_sentence_for_topic(s, topic) for s in sentences]

    # Combined score (TF-IDF + topic relevance + sentence type bonus)
    scored_sentences: list[tuple[float, int, str]] = []
    for i, sentence in enumerate(sentences):
        s_type = classify_sentence(sentence)
        # Bonus for informative sentence types
        type_bonus = {
            "definition": 2.0,
            "cause_effect": 1.5,
            "process": 1.5,
            "comparison": 1.3,
            "purpose": 1.3,
            "example": 0.8,
            "general": 1.0,
        }.get(s_type, 1.0)

        combined_score = (tfidf_scores[i] * type_bonus) + (topic_scores[i] * 2.0)
        scored_sentences.append((combined_score, i, s_type))

    # Sort by score descending
    scored_sentences.sort(key=lambda x: x[0], reverse=True)

    # --- Generate flashcards from top sentences ---
    flashcards: list[dict] = []
    used_subjects: set[str] = set()

    # Take more candidates than needed for diversity filtering
    candidates = scored_sentences[:count * 3]

    for score, idx, s_type in candidates:
        if len(flashcards) >= count:
            break

        sentence = sentences[idx]
        subject = extract_subject(sentence).lower()

        # Skip if we already have a card about a very similar subject
        if any(subject in used or used in subject for used in used_subjects if len(used) > 3):
            continue

        # Generate question
        question = generate_question(sentence, s_type)

        # Build answer with context (neighboring sentences)
        context = []
        if idx > 0:
            context.append(sentences[idx - 1])
        if idx < len(sentences) - 1:
            context.append(sentences[idx + 1])

        answer = generate_answer(sentence, context)

        # Quality checks
        if len(question.split()) < 4:
            continue
        if len(answer.split()) < 5:
            continue
        # Skip if question and answer are too similar
        q_words = set(tokenize_lower(question))
        a_words = set(tokenize_lower(answer))
        if q_words and a_words:
            overlap = len(q_words & a_words) / max(len(q_words), 1)
            if overlap > 0.8:
                continue

        flashcards.append({
            "front": question,
            "back": answer,
        })
        used_subjects.add(subject)
        print(f"  Generated card {len(flashcards)}/{count} [{s_type}]", file=sys.stderr)

    if not flashcards:
        raise ValueError("Failed to generate any valid flashcards from the text")

    return flashcards


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: echo '<text>' | python generate_flashcards.py <count> [topic]", file=sys.stderr)
        sys.exit(1)

    # Parse arguments
    try:
        count = int(sys.argv[1])
        count = max(5, min(20, count))
    except ValueError:
        print(f"Invalid count '{sys.argv[1]}'. Expected integer 5-20.", file=sys.stderr)
        sys.exit(1)

    topic = sys.argv[2] if len(sys.argv) > 2 else None

    # Read input text
    text = sys.stdin.read().strip()
    if not text:
        print("No input text provided on stdin.", file=sys.stderr)
        sys.exit(1)

    word_count = len(text.split())
    if word_count > MAX_INPUT_WORDS:
        print(f"Input too large ({word_count} words, max {MAX_INPUT_WORDS}).", file=sys.stderr)
        sys.exit(1)

    if word_count < MIN_CHUNK_WORDS:
        print(f"Input too short ({word_count} words, min {MIN_CHUNK_WORDS}).", file=sys.stderr)
        sys.exit(1)

    print(f"Processing {word_count} words, generating {count} flashcards...", file=sys.stderr)
    if topic:
        print(f"Topic focus: {topic}", file=sys.stderr)

    try:
        flashcards = generate_flashcards(text, count, topic)

        # Output JSON to stdout
        output = json.dumps(flashcards, ensure_ascii=False, indent=2)
        print(output)

        print(f"Successfully generated {len(flashcards)} flashcards.", file=sys.stderr)

    except Exception as e:
        print(f"Flashcard generation failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
