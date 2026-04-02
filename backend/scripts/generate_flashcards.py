"""
AI flashcard generation script using FLAN-T5.

Usage:
    echo "<text>" | python generate_flashcards.py <count> [topic]

Reads text from stdin, generates question-answer flashcards using
FLAN-T5-base (local HuggingFace model), and prints JSON array to stdout.
Errors are written to stderr and the process exits with code 1 on failure.

Arguments:
    count   - Number of flashcards to generate (5-20)
    topic   - Optional topic focus to filter/guide generation
"""

import sys
import io
import json
import re
import warnings
from typing import Optional

warnings.filterwarnings("ignore")

# Force UTF-8 output on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

MODEL_NAME = "google/flan-t5-small"
FALLBACK_MODEL = "google/flan-t5-base"
MAX_INPUT_WORDS = 30_000
MIN_CHUNK_WORDS = 15
MAX_ANSWER_LENGTH = 150
MAX_QUESTION_LENGTH = 80
BATCH_SIZE = 8  # Number of prompts to process in one batch


# ---------------------------------------------------------------------------
# Text processing
# ---------------------------------------------------------------------------

def split_into_chunks(text: str, min_words: int = 30, max_words: int = 150) -> list[str]:
    """Split text into meaningful chunks for Q&A generation."""
    # First split by paragraphs
    paragraphs = re.split(r'\n\s*\n', text.strip())
    chunks: list[str] = []
    
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
            
        # Split long paragraphs into sentences
        sentences = re.split(r'(?<=[.!?])\s+', para)
        current_chunk: list[str] = []
        current_word_count = 0
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
                
            word_count = len(sentence.split())
            
            # If adding this sentence exceeds max, save current and start new
            if current_word_count + word_count > max_words and current_chunk:
                chunk_text = ' '.join(current_chunk)
                if len(chunk_text.split()) >= min_words:
                    chunks.append(chunk_text)
                current_chunk = [sentence]
                current_word_count = word_count
            else:
                current_chunk.append(sentence)
                current_word_count += word_count
        
        # Don't forget the last chunk
        if current_chunk:
            chunk_text = ' '.join(current_chunk)
            if len(chunk_text.split()) >= min_words:
                chunks.append(chunk_text)
    
    return chunks


def filter_by_topic(chunks: list[str], topic: str) -> list[str]:
    """Filter chunks to those relevant to the topic."""
    if not topic:
        return chunks
    
    topic_lower = topic.lower()
    topic_words = set(topic_lower.split())
    
    scored_chunks: list[tuple[float, str]] = []
    for chunk in chunks:
        chunk_lower = chunk.lower()
        # Score based on topic word presence
        score = sum(1 for word in topic_words if word in chunk_lower)
        # Also check if full topic phrase appears
        if topic_lower in chunk_lower:
            score += 2
        scored_chunks.append((score, chunk))
    
    # Sort by score descending, keep chunks with score > 0 first
    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    
    # Return relevant chunks first, then others
    relevant = [chunk for score, chunk in scored_chunks if score > 0]
    others = [chunk for score, chunk in scored_chunks if score == 0]
    
    return relevant + others


# ---------------------------------------------------------------------------
# FLAN-T5 Generation
# ---------------------------------------------------------------------------

def load_model(model_name: str):
    """Load FLAN-T5 model and tokenizer."""
    try:
        from transformers import T5Tokenizer, T5ForConditionalGeneration
    except ImportError as e:
        raise RuntimeError(f"Required package 'transformers' not installed: {e}")

    try:
        print(f"Loading model {model_name}...", file=sys.stderr)
        tokenizer = T5Tokenizer.from_pretrained(model_name)
        model = T5ForConditionalGeneration.from_pretrained(model_name)
        return tokenizer, model
    except Exception as e:
        raise RuntimeError(f"Failed to load model {model_name}: {e}")


def batch_generate(tokenizer, model, prompts: list[str], max_length: int = 100) -> list[str]:
    """Generate text for multiple prompts in a single batch."""
    if not prompts:
        return []

    # Tokenize all prompts at once with padding
    inputs = tokenizer(
        prompts,
        return_tensors="pt",
        truncation=True,
        max_length=512,
        padding=True,
    )

    outputs = model.generate(
        inputs.input_ids,
        attention_mask=inputs.attention_mask,
        max_length=max_length,
        num_beams=2,
        do_sample=False,
        early_stopping=True,
    )

    return [
        tokenizer.decode(output, skip_special_tokens=True)
        for output in outputs
    ]


def generate_flashcards(text: str, count: int, topic: Optional[str] = None) -> list[dict]:
    """Generate flashcards from text using batched inference."""

    # Split text into chunks
    chunks = split_into_chunks(text)

    if not chunks:
        raise ValueError("No meaningful content found in input text")

    # Filter by topic if provided
    if topic:
        chunks = filter_by_topic(chunks, topic)

    # Load model
    try:
        tokenizer, model = load_model(MODEL_NAME)
    except Exception as primary_error:
        print(f"Primary model failed ({primary_error}), trying fallback...", file=sys.stderr)
        try:
            tokenizer, model = load_model(FALLBACK_MODEL)
        except Exception as fallback_error:
            raise RuntimeError(f"All models failed. Primary: {primary_error}, Fallback: {fallback_error}")

    # Take more chunks than needed to account for filtering
    candidate_chunks = chunks[:count * 2]

    print(f"Generating {count} flashcards from {len(candidate_chunks)} candidate chunks...", file=sys.stderr)

    # --- Phase 1: Batch generate questions ---
    question_prompts = [
        f"Generate a clear study question about: {chunk}"
        for chunk in candidate_chunks
    ]

    raw_questions: list[str] = []
    for batch_start in range(0, len(question_prompts), BATCH_SIZE):
        batch = question_prompts[batch_start:batch_start + BATCH_SIZE]
        try:
            results = batch_generate(tokenizer, model, batch, MAX_QUESTION_LENGTH)
            raw_questions.extend(results)
        except Exception as e:
            print(f"  Error in question batch starting at {batch_start}: {e}", file=sys.stderr)
            raw_questions.extend([""] * len(batch))

    print(f"  Generated {len(raw_questions)} raw questions", file=sys.stderr)

    # --- Filter questions and pick best candidates ---
    valid_indices: list[int] = []
    used_questions: set[str] = set()
    questions: list[str] = []

    for i, q in enumerate(raw_questions):
        q = q.strip()
        if q and not q.endswith('?'):
            q += '?'

        if len(q.split()) < 4:
            continue

        q_lower = q.lower()
        if any(existing in q_lower or q_lower in existing for existing in used_questions):
            continue

        valid_indices.append(i)
        questions.append(q)
        used_questions.add(q_lower)

        if len(valid_indices) >= count:
            break

    if not valid_indices:
        raise ValueError("Failed to generate any valid questions")

    # --- Phase 2: Batch generate answers ---
    answer_prompts = [
        f"Answer concisely: {questions[j]}\nContext: {candidate_chunks[valid_indices[j]]}"
        for j in range(len(valid_indices))
    ]

    raw_answers: list[str] = []
    for batch_start in range(0, len(answer_prompts), BATCH_SIZE):
        batch = answer_prompts[batch_start:batch_start + BATCH_SIZE]
        try:
            results = batch_generate(tokenizer, model, batch, MAX_ANSWER_LENGTH)
            raw_answers.extend(results)
        except Exception as e:
            print(f"  Error in answer batch starting at {batch_start}: {e}", file=sys.stderr)
            raw_answers.extend([""] * len(batch))

    print(f"  Generated {len(raw_answers)} raw answers", file=sys.stderr)

    # --- Assemble flashcards ---
    flashcards: list[dict] = []
    for j in range(len(valid_indices)):
        answer = raw_answers[j].strip() if j < len(raw_answers) else ""
        if len(answer.split()) < 3:
            continue

        flashcards.append({
            "front": questions[j],
            "back": answer,
        })
        print(f"  Assembled card {len(flashcards)}/{count}", file=sys.stderr)

    if not flashcards:
        raise ValueError("Failed to generate any valid flashcards")

    print(f"Successfully generated {len(flashcards)} flashcards.", file=sys.stderr)
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
        count = max(5, min(20, count))  # Clamp to 5-20 range
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
        
    except Exception as e:
        print(f"Flashcard generation failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
