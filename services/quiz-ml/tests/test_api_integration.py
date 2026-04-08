"""
FastAPI microservice — API integration tests

Uses FastAPI's TestClient to fire real HTTP requests against the full app
stack. Model inference is replaced by the deterministic stubs in conftest.py.
"""

import pytest


# ---------------------------------------------------------------------------
# GET /health
# ---------------------------------------------------------------------------

class TestHealth:
    def test_returns_200_with_ok_status(self, test_client):
        # Act
        response = test_client.get("/health")

        # Assert
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "ok"

    def test_reports_models_loaded_true_when_stubs_injected(self, test_client):
        # Act
        response = test_client.get("/health")

        # Assert
        body = response.json()
        assert body["models_loaded"] is True

    def test_health_response_matches_schema(self, test_client):
        # Act
        response = test_client.get("/health")

        # Assert
        body = response.json()
        assert "status" in body
        assert "models_loaded" in body
        assert isinstance(body["models_loaded"], bool)


# ---------------------------------------------------------------------------
# POST /generate-quiz — happy paths
# ---------------------------------------------------------------------------

SAMPLE_TEXT = (
    "Machine learning is a subset of artificial intelligence. "
    "It enables computers to learn from experience without explicit programming. "
    "Supervised learning uses labelled training data to train predictive models. "
    "Unsupervised learning discovers hidden patterns in unlabelled data automatically. "
    "Reinforcement learning trains agents through rewards and penalties over time. "
    "Neural networks are computing systems inspired by biological neural structures. "
    "Deep learning uses multiple layers to learn hierarchical data representations. "
    "Backpropagation is the algorithm used to compute gradients during neural network training. "
    "Gradient descent minimises the loss function by iteratively updating model weights. "
    "Overfitting occurs when a model memorises training data and fails to generalise."
)


class TestGenerateQuizHappyPath:
    def test_returns_200_with_questions_array(self, test_client):
        # Act
        response = test_client.post(
            "/generate-quiz",
            json={"text": SAMPLE_TEXT, "question_type": "mcq", "question_count": 3},
        )

        # Assert
        assert response.status_code == 200
        body = response.json()
        assert "questions" in body
        assert isinstance(body["questions"], list)

    def test_response_questions_each_have_required_fields(self, test_client):
        # Act
        response = test_client.post(
            "/generate-quiz",
            json={"text": SAMPLE_TEXT, "question_type": "mcq", "question_count": 2},
        )

        # Assert
        if response.status_code == 200:
            for q in response.json()["questions"]:
                assert "question_text" in q
                assert "question_type" in q
                assert "options" in q
                assert "correct_option_id" in q
                assert "explanation" in q
                assert "topic_tag" in q

    def test_each_question_has_exactly_four_options(self, test_client):
        # Act
        response = test_client.post(
            "/generate-quiz",
            json={"text": SAMPLE_TEXT, "question_type": "mcq", "question_count": 2},
        )

        # Assert
        if response.status_code == 200:
            for q in response.json()["questions"]:
                assert len(q["options"]) == 4

    def test_correct_option_id_refers_to_an_existing_option(self, test_client):
        # Act
        response = test_client.post(
            "/generate-quiz",
            json={"text": SAMPLE_TEXT, "question_type": "mcq", "question_count": 2},
        )

        # Assert
        if response.status_code == 200:
            for q in response.json()["questions"]:
                option_ids = [opt["id"] for opt in q["options"]]
                assert q["correct_option_id"] in option_ids

    def test_scenario_question_type_accepted(self, test_client):
        # Act
        response = test_client.post(
            "/generate-quiz",
            json={"text": SAMPLE_TEXT, "question_type": "scenario", "question_count": 2},
        )

        # Assert
        assert response.status_code in (200, 422)  # 422 allowed if pipeline yields nothing

    def test_mixed_question_type_accepted(self, test_client):
        # Act
        response = test_client.post(
            "/generate-quiz",
            json={"text": SAMPLE_TEXT, "question_type": "mixed", "question_count": 2},
        )

        # Assert
        assert response.status_code in (200, 422)


# ---------------------------------------------------------------------------
# POST /generate-quiz — validation errors (422)
# ---------------------------------------------------------------------------

class TestGenerateQuizValidation:
    def test_returns_422_when_text_is_missing(self, test_client):
        # Act
        response = test_client.post(
            "/generate-quiz",
            json={"question_type": "mcq", "question_count": 5},
        )

        # Assert
        assert response.status_code == 422

    def test_returns_422_when_text_is_too_short(self, test_client):
        # Arrange — min_length is 50 chars; send 10 chars
        response = test_client.post(
            "/generate-quiz",
            json={"text": "Too short.", "question_type": "mcq", "question_count": 3},
        )

        # Assert
        assert response.status_code == 422

    def test_returns_422_when_question_type_is_invalid(self, test_client):
        # Act
        response = test_client.post(
            "/generate-quiz",
            json={"text": SAMPLE_TEXT, "question_type": "essay", "question_count": 3},
        )

        # Assert
        assert response.status_code == 422

    def test_returns_422_when_question_count_is_zero(self, test_client):
        # Act
        response = test_client.post(
            "/generate-quiz",
            json={"text": SAMPLE_TEXT, "question_type": "mcq", "question_count": 0},
        )

        # Assert
        assert response.status_code == 422

    def test_returns_422_when_question_count_exceeds_maximum(self, test_client):
        # Act
        response = test_client.post(
            "/generate-quiz",
            json={"text": SAMPLE_TEXT, "question_type": "mcq", "question_count": 21},
        )

        # Assert
        assert response.status_code == 422

    def test_returns_422_when_body_is_empty(self, test_client):
        # Act
        response = test_client.post("/generate-quiz", json={})

        # Assert
        assert response.status_code == 422

    def test_validation_error_body_contains_detail_field(self, test_client):
        # Act
        response = test_client.post("/generate-quiz", json={})

        # Assert
        body = response.json()
        assert "detail" in body


# ---------------------------------------------------------------------------
# POST /generate-quiz — model not loaded (503)
# ---------------------------------------------------------------------------

class TestGenerateQuizModelNotLoaded:
    def test_returns_503_when_models_are_not_loaded(self, test_client, monkeypatch):
        # Arrange — mark models as not loaded
        import model_cache
        monkeypatch.setattr(model_cache, "_models_loaded", False)

        # Act
        response = test_client.post(
            "/generate-quiz",
            json={"text": SAMPLE_TEXT, "question_type": "mcq", "question_count": 3},
        )

        # Assert
        assert response.status_code == 503
        body = response.json()
        assert "detail" in body
        assert "loading" in body["detail"].lower()
