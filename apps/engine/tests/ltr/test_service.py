from __future__ import annotations

import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import numpy as np
import pytest

from engine.ltr.service import LTRService, ScoredDocument, get_ltr_service
from engine.models.ltr import DocumentFeatures, UserContext


class TestScoredDocumentTypedDict:
    def test_structure(self):
        doc: ScoredDocument = {
            "doc_id": "doc_1",
            "score": 0.85,
            "features": {"bm25_title": 0.5},
        }
        assert doc["doc_id"] == "doc_1"
        assert doc["score"] == 0.85
        assert "bm25_title" in doc["features"]


class TestLTRServiceConstants:
    def test_default_model_path(self):
        assert Path("/models/ltr") == LTRService.DEFAULT_MODEL_PATH


class TestLTRServiceInit:
    def test_init_with_defaults(self):
        with (
            patch.object(LTRService, "_load_model"),
            patch("engine.ltr.service.LTRFeatureExtractor") as mock_extractor,
        ):
            service = LTRService()

            assert service._model_path == LTRService.DEFAULT_MODEL_PATH
            assert service._model_version == "latest"
            assert service._model is None
            mock_extractor.assert_called_once()

    def test_init_with_custom_path(self):
        custom_path = Path("/custom/model/path")
        with (
            patch.object(LTRService, "_load_model"),
            patch("engine.ltr.service.LTRFeatureExtractor"),
        ):
            service = LTRService(model_path=custom_path, model_version="v1")

            assert service._model_path == custom_path
            assert service._model_version == "v1"

    def test_init_calls_load_model(self):
        with (
            patch.object(LTRService, "_load_model") as mock_load,
            patch("engine.ltr.service.LTRFeatureExtractor"),
        ):
            LTRService()

            mock_load.assert_called_once()


class TestLoadModel:
    def test_load_model_when_file_exists(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            model_path = Path(tmpdir)
            version_path = model_path / "latest"
            version_path.mkdir(parents=True)
            model_file = version_path / "model.txt"
            model_file.write_text("model content")

            mock_booster = MagicMock()
            with (
                patch("engine.ltr.service.lgb.Booster", return_value=mock_booster),
                patch("engine.ltr.service.LTRFeatureExtractor"),
            ):
                service = LTRService(model_path=model_path)

                assert service._model is mock_booster

    def test_load_model_when_file_not_exists(self):
        with (
            tempfile.TemporaryDirectory() as tmpdir,
            patch("engine.ltr.service.lgb.Booster") as mock_booster_class,
            patch("engine.ltr.service.LTRFeatureExtractor"),
            patch("engine.ltr.service.logger"),
        ):
            service = LTRService(model_path=Path(tmpdir))

            assert service._model is None
            mock_booster_class.assert_not_called()


class TestReloadModel:
    def test_reload_model_with_new_version(self):
        with (
            patch.object(LTRService, "_load_model") as mock_load,
            patch("engine.ltr.service.LTRFeatureExtractor"),
        ):
            service = LTRService()
            mock_load.reset_mock()

            service.reload_model(version="v2")

            assert service._model_version == "v2"
            mock_load.assert_called_once()

    def test_reload_model_same_version(self):
        with (
            patch.object(LTRService, "_load_model") as mock_load,
            patch("engine.ltr.service.LTRFeatureExtractor"),
        ):
            service = LTRService()
            mock_load.reset_mock()

            service.reload_model()

            mock_load.assert_called_once()


class TestProperties:
    def test_is_ready_true_when_model_loaded(self):
        with (
            patch.object(LTRService, "_load_model"),
            patch("engine.ltr.service.LTRFeatureExtractor"),
        ):
            service = LTRService()
            service._model = MagicMock()

            assert service.is_ready is True

    def test_is_ready_false_when_no_model(self):
        with (
            patch.object(LTRService, "_load_model"),
            patch("engine.ltr.service.LTRFeatureExtractor"),
        ):
            service = LTRService()

            assert service.is_ready is False

    def test_model_version_property(self):
        with (
            patch.object(LTRService, "_load_model"),
            patch("engine.ltr.service.LTRFeatureExtractor"),
        ):
            service = LTRService(model_version="v3")

            assert service.model_version == "v3"

    def test_feature_count_property(self):
        mock_extractor = MagicMock()
        mock_extractor.feature_count = 19
        with (
            patch.object(LTRService, "_load_model"),
            patch("engine.ltr.service.LTRFeatureExtractor", return_value=mock_extractor),
        ):
            service = LTRService()

            assert service.feature_count == 19

    def test_model_path_property(self):
        custom_path = Path("/custom/path")
        with (
            patch.object(LTRService, "_load_model"),
            patch("engine.ltr.service.LTRFeatureExtractor"),
        ):
            service = LTRService(model_path=custom_path)

            assert service.model_path == custom_path


class TestScore:
    @pytest.fixture
    def service(self):
        with (
            patch.object(LTRService, "_load_model"),
            patch("engine.ltr.service.LTRFeatureExtractor") as mock_extractor_class,
        ):
            mock_extractor = MagicMock()
            mock_extractor.feature_names = ["f1", "f2", "f3"]
            mock_extractor.extract_batch.return_value = np.array(
                [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]], dtype=np.float32
            )
            mock_extractor_class.return_value = mock_extractor
            s = LTRService()
            s._model = MagicMock()
            s._model.predict.return_value = np.array([0.9, 0.7])
            return s

    def test_score_returns_empty_when_not_ready(self):
        with (
            patch.object(LTRService, "_load_model"),
            patch("engine.ltr.service.LTRFeatureExtractor"),
        ):
            service = LTRService()
            docs = [DocumentFeatures(doc_id="doc_1")]

            results, elapsed = service.score(docs, "query")

            assert results == []
            assert elapsed == 0.0

    def test_score_returns_empty_when_no_docs(self, service):
        results, elapsed = service.score([], "query")

        assert results == []
        assert elapsed == 0.0

    def test_score_returns_scored_documents(self, service):
        docs = [
            DocumentFeatures(doc_id="doc_1"),
            DocumentFeatures(doc_id="doc_2"),
        ]

        with patch("engine.ltr.service.logger"):
            results, elapsed = service.score(docs, "query")

        assert len(results) == 2
        assert results[0]["doc_id"] == "doc_1"
        assert results[0]["score"] == 0.9
        assert "f1" in results[0]["features"]

    def test_score_sorts_by_score_descending(self, service):
        service._model.predict.return_value = np.array([0.3, 0.9])
        docs = [
            DocumentFeatures(doc_id="doc_1"),
            DocumentFeatures(doc_id="doc_2"),
        ]

        with patch("engine.ltr.service.logger"):
            results, _ = service.score(docs, "query")

        assert results[0]["doc_id"] == "doc_2"
        assert results[1]["doc_id"] == "doc_1"

    def test_score_respects_top_k(self, service):
        service._feature_extractor.extract_batch.return_value = np.array(
            [[0.1] * 3, [0.2] * 3, [0.3] * 3], dtype=np.float32
        )
        service._model.predict.return_value = np.array([0.9, 0.7, 0.5])
        docs = [
            DocumentFeatures(doc_id="doc_1"),
            DocumentFeatures(doc_id="doc_2"),
            DocumentFeatures(doc_id="doc_3"),
        ]

        with patch("engine.ltr.service.logger"):
            results, _ = service.score(docs, "query", top_k=2)

        assert len(results) == 2

    def test_score_with_user_context(self, service):
        service._feature_extractor.extract_batch.return_value = np.array(
            [[0.1, 0.2, 0.3]], dtype=np.float32
        )
        service._model.predict.return_value = np.array([0.9])
        docs = [DocumentFeatures(doc_id="doc_1")]
        user_context = UserContext(user_id="user_1", team_id="team_1")

        with patch("engine.ltr.service.logger"):
            service.score(docs, "query", user_context=user_context)

        service._feature_extractor.extract_batch.assert_called_once_with(
            docs, "query", user_context
        )

    def test_score_returns_elapsed_time(self, service):
        service._feature_extractor.extract_batch.return_value = np.array(
            [[0.1, 0.2, 0.3]], dtype=np.float32
        )
        service._model.predict.return_value = np.array([0.9])
        docs = [DocumentFeatures(doc_id="doc_1")]

        with patch("engine.ltr.service.logger"):
            _, elapsed = service.score(docs, "query")

        assert 0 <= elapsed < 1.0, f"Elapsed time {elapsed}s unreasonable for mocked test"
        assert isinstance(elapsed, float)


class TestGetLTRService:
    @pytest.fixture(autouse=True)
    def reset_singleton(self):
        import engine.ltr.service as service_module

        original = service_module._service_instance
        service_module._service_instance = None
        yield
        service_module._service_instance = original

    def test_creates_singleton(self):
        with (
            patch.object(LTRService, "_load_model"),
            patch("engine.ltr.service.LTRFeatureExtractor"),
        ):
            instance1 = get_ltr_service()
            instance2 = get_ltr_service()

            assert instance1 is instance2

    def test_returns_existing_instance(self):
        import engine.ltr.service as service_module

        mock_instance = MagicMock(spec=LTRService)
        service_module._service_instance = mock_instance

        result = get_ltr_service()

        assert result is mock_instance
