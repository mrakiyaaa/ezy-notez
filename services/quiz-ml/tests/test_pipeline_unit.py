"""
FastAPI microservice — pipeline unit tests

Each stage of the NLP pipeline is tested in isolation using the deterministic
stub models injected by conftest.py (stub_model_cache + stub_nltk are autouse).
"""

import pytest


# ---------------------------------------------------------------------------
# Stage 1 — Preprocessing
# ---------------------------------------------------------------------------

class TestPreprocess:
    def test_returns_list_of_chunks_from_normal_text(self):
        # Arrange
        from pipeline import preprocess
        text = (
            "Machine learning is a subset of artificial intelligence. "
            "It allows computers to learn from data. "
            "Supervised learning uses labelled examples. "
            "Unsupervised learning finds hidden patterns. "
            "Reinforcement learning uses rewards and penalties."
        )

        # Act
        chunks = preprocess(text)

        # Assert
        assert isinstance(chunks, list)
        assert len(chunks) >= 1

    def test_filters_short_sentences(self):
        # Arrange
        from pipeline import preprocess
        text = "Hi. This sentence is long enough to pass the filter because it has many words."

        # Act
        chunks = preprocess(text)

        # Assert — "Hi." (1 word) should be filtered out; result should not be empty
        assert len(chunks) >= 1
        for chunk in chunks:
            assert len(chunk.split()) >= 5

    def test_cleans_null_bytes_from_text(self):
        # Arrange
        from pipeline import preprocess
        text = "This text has null bytes\x00 embedded in it for testing purposes and filtering."

        # Act
        chunks = preprocess(text)

        # Assert
        for chunk in chunks:
            assert "\x00" not in chunk

    def test_returns_empty_list_for_text_with_no_long_sentences(self):
        # Arrange
        from pipeline import preprocess
        text = "Hi. OK. Yes. No. Sure."

        # Act
        chunks = preprocess(text)

        # Assert — all sentences are shorter than 5 words, so result should be empty
        assert chunks == []


# ---------------------------------------------------------------------------
# Stage 2 — Answer Extraction
# ---------------------------------------------------------------------------

class TestExtractAnswers:
    def test_returns_chunk_answer_pairs(self):
        # Arrange
        from pipeline import extract_answers
        chunks = [
            "Machine learning is a subset of artificial intelligence that learns from data automatically."
        ]

        # Act
        pairs = extract_answers(chunks, answers_per_chunk=3)

        # Assert
        assert isinstance(pairs, list)
        assert len(pairs) >= 1
        for chunk, phrase in pairs:
            assert isinstance(chunk, str)
            assert isinstance(phrase, str)
            assert len(phrase.split()) <= 4  # service constraint

    def test_skips_chunk_with_fewer_than_10_words(self):
        # Arrange
        from pipeline import extract_answers
        short_chunk = ["Too short chunk here."]

        # Act
        pairs = extract_answers(short_chunk, answers_per_chunk=3)

        # Assert — short chunk should be skipped
        assert pairs == []

    def test_returns_empty_list_for_empty_chunks(self):
        # Arrange
        from pipeline import extract_answers

        # Act
        pairs = extract_answers([], answers_per_chunk=3)

        # Assert
        assert pairs == []


# ---------------------------------------------------------------------------
# Stage 3 — Question Generation
# ---------------------------------------------------------------------------

class TestGenerateQuestionsBatch:
    def test_returns_list_of_question_answer_chunk_triples(self):
        # Arrange
        from pipeline import generate_questions_batch
        pairs = [
            ("Machine learning enables computers to learn from data without explicit programming.",
             "machine learning"),
        ]

        # Act
        results = generate_questions_batch(pairs, batch_size=4)

        # Assert — _DummyTokenizer.decode returns "What is machine learning?"
        assert isinstance(results, list)
        # The dummy model returns a question ending in "?"
        if results:
            for question, answer, chunk in results:
                assert question.endswith("?")
                assert isinstance(answer, str)
                assert isinstance(chunk, str)

    def test_returns_empty_list_for_empty_pairs(self):
        # Arrange
        from pipeline import generate_questions_batch

        # Act
        results = generate_questions_batch([], batch_size=4)

        # Assert
        assert results == []


# ---------------------------------------------------------------------------
# Stage 4 — Distractor Generation
# ---------------------------------------------------------------------------

class TestBuildOptions:
    def test_returns_exactly_four_options(self):
        # Arrange
        from pipeline import build_options
        chunk = "Neural networks are inspired by the human brain and used in deep learning tasks."

        # Act
        options, correct_id = build_options("neural networks", chunk)

        # Assert
        assert len(options) == 4

    def test_correct_option_id_is_among_options(self):
        # Arrange
        from pipeline import build_options
        chunk = "Supervised learning requires labelled training data for model optimisation."

        # Act
        options, correct_id = build_options("supervised learning", chunk)

        # Assert
        option_ids = [opt.id for opt in options]
        assert correct_id in option_ids

    def test_each_option_has_label_a_through_d(self):
        # Arrange
        from pipeline import build_options
        chunk = "Gradient descent is an optimisation algorithm used to minimise the loss function."

        # Act
        options, _ = build_options("gradient descent", chunk)

        # Assert
        labels = {opt.label for opt in options}
        assert labels == {"A", "B", "C", "D"}

    def test_options_have_non_empty_text(self):
        # Arrange
        from pipeline import build_options
        chunk = "Backpropagation computes gradients efficiently by applying the chain rule repeatedly."

        # Act
        options, _ = build_options("backpropagation", chunk)

        # Assert
        for opt in options:
            assert opt.text.strip() != ""


# ---------------------------------------------------------------------------
# Stage 5 — Topic Tagging
# ---------------------------------------------------------------------------

class TestExtractTopicTag:
    def test_returns_a_non_empty_string(self):
        # Arrange
        from pipeline import extract_topic_tag
        chunk = "Convolutional neural networks are widely used in image recognition tasks."

        # Act
        tag = extract_topic_tag(chunk)

        # Assert
        assert isinstance(tag, str)
        assert len(tag) > 0

    def test_returns_general_for_empty_chunk(self, monkeypatch):
        # Arrange
        from pipeline import extract_topic_tag
        import model_cache

        # Force KeyBERT to return nothing
        class _EmptyKB:
            def extract_keywords(self, *a, **kw):
                return []

        monkeypatch.setattr(model_cache, "_keybert_model", _EmptyKB())

        # Act
        tag = extract_topic_tag("short")

        # Assert
        assert tag == "General"


# ---------------------------------------------------------------------------
# Stage 6 — Quality Filtering
# ---------------------------------------------------------------------------

class TestFilterAndRank:
    def test_returns_at_most_question_count_items(self):
        # Arrange
        from pipeline import filter_and_rank
        candidates = [
            (f"What is concept {i}?", f"concept {i}", "Some chunk about concepts.")
            for i in range(10)
        ]

        # Act
        result = filter_and_rank(candidates, question_count=3)

        # Assert
        assert len(result) <= 3

    def test_removes_question_where_answer_appears_verbatim(self):
        # Arrange
        from pipeline import filter_and_rank
        # Question trivially contains the answer text
        candidates = [
            ("What is machine learning?", "machine learning", "Some chunk."),
        ]

        # Act
        result = filter_and_rank(candidates, question_count=5)

        # Assert — trivial question must be filtered
        assert result == []

    def test_deduplicates_near_identical_questions(self):
        # Arrange
        from pipeline import filter_and_rank
        # Two questions that are nearly identical (high Jaccard similarity)
        q1 = "What is the definition of supervised learning?"
        q2 = "What is the definition of supervised learning here?"
        candidates = [
            (q1, "supervised learning", "Chunk about supervised methods."),
            (q2, "supervised learning", "Chunk about supervised methods."),
        ]

        # Act
        result = filter_and_rank(candidates, question_count=5)

        # Assert — only one should survive deduplication (Jaccard > 0.7)
        assert len(result) <= 1

    def test_preserves_distinct_questions(self):
        # Arrange
        from pipeline import filter_and_rank
        candidates = [
            ("What role does backpropagation play in training networks?", "backpropagation", "chunk"),
            ("How does gradient descent minimise the loss function effectively?", "gradient descent", "chunk"),
        ]

        # Act
        result = filter_and_rank(candidates, question_count=5)

        # Assert — both distinct questions should survive
        assert len(result) == 2


# ---------------------------------------------------------------------------
# Output schema validation
# ---------------------------------------------------------------------------

class TestOutputSchema:
    def test_generated_question_has_required_fields(self):
        # Arrange
        from models import GeneratedQuestion, QuestionOption
        import uuid

        options = [
            QuestionOption(id=str(uuid.uuid4()), label=lbl, text=f"Option {lbl}")
            for lbl in ["A", "B", "C", "D"]
        ]
        correct_id = options[0].id

        # Act
        q = GeneratedQuestion(
            question_text="What is AI?",
            question_type="mcq",
            options=options,
            correct_option_id=correct_id,
            explanation="AI stands for Artificial Intelligence.",
            topic_tag="Artificial Intelligence",
        )

        # Assert
        assert q.question_text == "What is AI?"
        assert q.question_type == "mcq"
        assert len(q.options) == 4
        assert q.correct_option_id == correct_id

    def test_question_option_label_is_single_letter(self):
        # Arrange
        from models import QuestionOption
        import uuid

        # Act
        opt = QuestionOption(id=str(uuid.uuid4()), label="B", text="Some answer text")

        # Assert
        assert opt.label == "B"
        assert len(opt.label) == 1
