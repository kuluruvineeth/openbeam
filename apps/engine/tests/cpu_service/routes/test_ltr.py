from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from engine.cpu_service.routes.ltr import router


@pytest.fixture
def mock_ltr_service():
    service = MagicMock()
    service.is_ready = True
    service.model_version = "v1.0"
    service.feature_count = 19
    service.model_path = Path("/models/ltr")
    service.score = MagicMock(
        return_value=(
            [
                {"doc_id": "doc_1", "score": 0.95, "features": {"bm25_title": 0.8}},
                {"doc_id": "doc_2", "score": 0.85, "features": {"bm25_title": 0.6}},
            ],
            5.5,
        )
    )
    service.reload_model = MagicMock()
    return service


@pytest.fixture
def app(mock_ltr_service):
    test_app = FastAPI()
    test_app.include_router(router)
    test_app.state.ltr_service = mock_ltr_service
    return test_app


@pytest.fixture
def client(app):
    return TestClient(app)


class TestScore:
    def test_score_success(self, client, mock_ltr_service):
        response = client.post(
            "/ltr",
            json={
                "query": "test search",
                "documents": [
                    {"doc_id": "doc_1", "bm25_title": 0.8, "dense_score": 0.7},
                    {"doc_id": "doc_2", "bm25_title": 0.6, "dense_score": 0.5},
                ],
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) == 2
        assert data["results"][0]["doc_id"] == "doc_1"
        assert data["results"][0]["score"] == 0.95
        assert data["elapsed_ms"] == 5.5
        assert data["model_version"] == "v1.0"
        assert data["feature_count"] == 19
        mock_ltr_service.score.assert_called_once()

    def test_score_with_user_context(self, client, mock_ltr_service):
        response = client.post(
            "/ltr",
            json={
                "query": "test search",
                "documents": [{"doc_id": "doc_1"}],
                "user_context": {
                    "user_id": "user_1",
                    "team_id": "team_1",
                    "department": "engineering",
                },
            },
        )

        assert response.status_code == 200
        call_kwargs = mock_ltr_service.score.call_args
        assert call_kwargs.kwargs["user_context"] is not None
        assert call_kwargs.kwargs["user_context"].user_id == "user_1"

    def test_score_with_top_k(self, client, mock_ltr_service):
        response = client.post(
            "/ltr",
            json={
                "query": "test search",
                "documents": [{"doc_id": "doc_1"}],
                "top_k": 5,
            },
        )

        assert response.status_code == 200
        call_kwargs = mock_ltr_service.score.call_args
        assert call_kwargs.kwargs["top_k"] == 5

    def test_score_model_not_ready(self, client, mock_ltr_service):
        mock_ltr_service.is_ready = False

        response = client.post(
            "/ltr",
            json={
                "query": "test search",
                "documents": [{"doc_id": "doc_1"}],
            },
        )

        assert response.status_code == 503
        assert "LTR model not loaded" in response.json()["detail"]

    def test_score_missing_query(self, client):
        response = client.post(
            "/ltr",
            json={
                "documents": [{"doc_id": "doc_1"}],
            },
        )

        assert response.status_code == 422

    def test_score_empty_documents(self, client):
        response = client.post(
            "/ltr",
            json={
                "query": "test",
                "documents": [],
            },
        )

        assert response.status_code == 422

    def test_score_top_k_validation(self, client):
        response = client.post(
            "/ltr",
            json={
                "query": "test",
                "documents": [{"doc_id": "doc_1"}],
                "top_k": 200,
            },
        )

        assert response.status_code == 422


class TestHealth:
    def test_health_ready(self, client, mock_ltr_service):
        mock_ltr_service.is_ready = True

        response = client.get("/ltr/health")

        assert response.status_code == 200
        data = response.json()
        assert data["ready"] is True
        assert data["model_version"] == "v1.0"
        assert data["feature_count"] == 19

    def test_health_not_ready(self, client, mock_ltr_service):
        mock_ltr_service.is_ready = False

        response = client.get("/ltr/health")

        assert response.status_code == 200
        data = response.json()
        assert data["ready"] is False


class TestReload:
    def test_reload_default_version(self, client, mock_ltr_service):
        response = client.post("/ltr/reload")

        assert response.status_code == 200
        data = response.json()
        assert data["reloaded"] is True
        assert data["model_version"] == "v1.0"
        mock_ltr_service.reload_model.assert_called_once_with(None)

    def test_reload_specific_version(self, client, mock_ltr_service):
        response = client.post("/ltr/reload", params={"version": "v2.0"})

        assert response.status_code == 200
        mock_ltr_service.reload_model.assert_called_once_with("v2.0")


class TestTrain:
    @pytest.fixture
    def valid_training_request(self):
        return {
            "team_id": "team_1",
            "version": "v1.1",
            "impressions": [
                {
                    "id": f"imp_{i}",
                    "query": f"query {i}",
                    "result_doc_ids": [f"doc_{j}" for j in range(3)],
                    "clicks": [
                        {
                            "doc_id": f"doc_{i % 3}",
                            "position": i % 3,
                            "dwell_time_ms": 15000,
                            "feedback_type": None,
                        }
                    ],
                }
                for i in range(15)
            ],
            "features_by_doc": {
                f"doc_{i}": {
                    "bm25_title": 0.5 + i * 0.1,
                    "dense_score": 0.6,
                }
                for i in range(5)
            },
        }

    def test_train_insufficient_impressions(self, client, mock_ltr_service):
        response = client.post(
            "/ltr/train",
            json={
                "team_id": "team_1",
                "version": "v1.0",
                "impressions": [
                    {
                        "id": "imp_1",
                        "query": "test",
                        "result_doc_ids": ["doc_1"],
                        "clicks": [],
                    }
                ],
                "features_by_doc": {"doc_1": {}},
            },
        )

        assert response.status_code == 400
        assert "Insufficient training data" in response.json()["detail"]

    def test_train_insufficient_queries(self, client, mock_ltr_service):
        impressions = [
            {
                "id": f"imp_{i}",
                "query": "same query",
                "result_doc_ids": ["doc_1", "doc_2"],
                "clicks": [{"doc_id": "doc_1", "position": 0}],
            }
            for i in range(10)
        ]

        with patch("engine.cpu_service.routes.ltr.LTRTrainer") as mock_trainer_class:
            mock_trainer = MagicMock()
            mock_trainer_class.return_value = mock_trainer
            mock_trainer.prepare_training_data.return_value = (
                MagicMock(),
                MagicMock(),
                [20],
            )

            response = client.post(
                "/ltr/train",
                json={
                    "team_id": "team_1",
                    "version": "v1.0",
                    "impressions": impressions,
                    "features_by_doc": {
                        "doc_1": {"bm25_title": 0.8},
                        "doc_2": {"bm25_title": 0.6},
                    },
                },
            )

            assert response.status_code == 400
            assert "Insufficient training queries" in response.json()["detail"]

    def test_train_success(self, client, mock_ltr_service, valid_training_request):
        with patch("engine.cpu_service.routes.ltr.LTRTrainer") as mock_trainer_class:
            mock_trainer = MagicMock()
            mock_trainer_class.return_value = mock_trainer
            mock_trainer.prepare_training_data.return_value = (
                MagicMock(),
                MagicMock(),
                [3, 3, 3, 3, 3],
            )
            mock_trainer.train.return_value = MagicMock(
                metrics={"ndcg@10": 0.85},
                feature_importance={"bm25_title": 0.3},
                training_time_seconds=2.5,
                num_queries=5,
                num_documents=15,
            )
            mock_trainer.save_model.return_value = Path("/models/ltr/v1.1")

            response = client.post(
                "/ltr/train",
                json=valid_training_request,
            )

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["version"] == "v1.1"
            assert data["model_path"] == "/models/ltr/v1.1"
            assert data["metrics"]["ndcg@10"] == 0.85
            assert data["training_time_seconds"] == 2.5
            assert data["num_queries"] == 5
            assert data["num_documents"] == 15
