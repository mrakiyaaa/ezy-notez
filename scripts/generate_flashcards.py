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

MODEL_NAME = "google/flan-t5-base"
FALLBACK_MODEL = "google/flan-t5-small"
MAX_INPUT_WORDS = 30_000
MIN_CHUNK_WORDS = 15
MAX_ANSWER_LENGTH = 150
MAX_QUESTION_LENGTH = 80


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


def generate_text(tokenizer, model, prompt: str, max_length: int = 100) -> str:
    """Generate text using FLAN-T5."""
    inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512)
    outputs = model.generate(
        inputs.input_ids,
        max_length=max_length,
        num_beams=4,
        do_sample=False,
        early_stopping=True
    )
    return tokenizer.decode(outputs[0], skip_special_tokens=True)


def generate_question(tokenizer, model, chunk: str) -> str:
    """Generate a study question from a text chunk."""
    prompt = f"Generate a clear study question about: {chunk}"
    question = generate_text(tokenizer, model, prompt, MAX_QUESTION_LENGTH)
    
    # Clean up the question
    question = question.strip()
    if question and not question.endswith('?'):
        question += '?'
    
    return question


def generate_answer(tokenizer, model, question: str, context: str) -> str:
    """Generate an answer based on context."""
    prompt = f"Answer concisely: {question}\nContext: {context}"
    answer = generate_text(tokenizer, model, prompt, MAX_ANSWER_LENGTH)
    return answer.strip()


def generate_flashcards(text: str, count: int, topic: Optional[str] = None) -> list[dict]:
    """Generate flashcards from text."""
    
    # Split text into chunks
    chunks = split_into_chunks(text)
    
    if not chunks:
        raise ValueError("No meaningful content found in input text")
    
    # Filter by topic if provided
    if topic:
        chunks = filter_by_topic(chunks, topic)
    
    # Load model (try base, fallback to small)
    try:
        tokenizer, model = load_model(MODEL_NAME)
    except Exception as base_error:
        print(f"Base model failed ({base_error}), trying small model...", file=sys.stderr)
        try:
            tokenizer, model = load_model(FALLBACK_MODEL)
        except Exception as small_error:
            raise RuntimeError(f"All models failed. Base: {base_error}, Small: {small_error}")
    
    # Generate flashcards
    flashcards: list[dict] = []
    used_questions: set[str] = set()
    
    print(f"Generating {count} flashcards from {len(chunks)} chunks...", file=sys.stderr)
    
    for i, chunk in enumerate(chunks):
        if len(flashcards) >= count:
            break
        
        try:
            # Generate question
            question = generate_question(tokenizer, model, chunk)
            
            # Skip if question is too similar to existing ones
            question_lower = question.lower()
            if any(q in question_lower or question_lower in q for q in used_questions):
                continue
            
            # Skip very short or generic questions
            if len(question.split()) < 4:
                continue
            
            # Generate answer
            answer = generate_answer(tokenizer, model, question, chunk)
            
            # Skip if answer is too short
            if len(answer.split()) < 3:
                continue
            
            flashcards.append({
                "front": question,
                "back": answer
            })
            used_questions.add(question_lower)
            
            print(f"  Generated card {len(flashcards)}/{count}", file=sys.stderr)
            
        except Exception as e:
            print(f"  Error generating from chunk {i}: {e}", file=sys.stderr)
            continue
    
    if not flashcards:
        raise ValueError("Failed to generate any valid flashcards")
    
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
        
        print(f"Successfully generated {len(flashcards)} flashcards.", file=sys.stderr)
        
    except Exception as e:
        print(f"Flashcard generation failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
