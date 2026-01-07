from __future__ import annotations

from unittest.mock import MagicMock, patch

import numpy as np
import pytest

from engine.ltr.trainer import (
    LTRTrainer,
    TrainingConfig,
    TrainingResult,
    train_lambdamart,
)


class TestTrainingConfig:
    def test_default_values(self):
        config = TrainingConfig()

        assert config.objective == "lambdarank"
        assert config.metric == "ndcg"
        assert config.ndcg_eval_at == [5, 10, 20]
        assert config.num_leaves == 31
        assert config.learning_rate == 0.05
        assert config.min_data_in_leaf == 20
        assert config.feature_fraction == 0.8
        assert config.bagging_fraction == 0.8
        assert config.bagging_freq == 5
        assert config.num_boost_round == 500
        assert config.early_stopping_rounds == 50
        assert config.verbose == -1

    def test_custom_values(self):
        config = TrainingConfig(
            num_leaves=63,
            learning_rate=0.1,
            num_boost_round=200,
        )

        assert config.num_leaves == 63
        assert config.learning_rate == 0.1
        assert config.num_boost_round == 200


class TestTrainingResult:
    def test_stores_all_fields(self):
        mock_model = MagicMock()
        result = TrainingResult(
            model=mock_model,
            metrics={"ndcg": 0.85},
            feature_importance={"f1": 100.0, "f2": 50.0},
            training_time_seconds=10.5,
            num_queries=100,
            num_documents=1000,
        )

        assert result.model is mock_model
        assert result.metrics == {"ndcg": 0.85}
        assert result.feature_importance == {"f1": 100.0, "f2": 50.0}
        assert result.training_time_seconds == 10.5
        assert result.num_queries == 100
        assert result.num_documents == 1000


class TestLTRTrainer:
    @pytest.fixture
    def trainer(self):
        return LTRTrainer()

    @pytest.fixture
    def custom_trainer(self):
        return LTRTrainer(TrainingConfig(num_leaves=15, learning_rate=0.1))

    def test_init_with_default_config(self, trainer):
        assert trainer._config.objective == "lambdarank"
        assert trainer._config.num_leaves == 31

    def test_init_with_custom_config(self, custom_trainer):
        assert custom_trainer._config.num_leaves == 15
        assert custom_trainer._config.learning_rate == 0.1

    def test_default_config_is_class_attribute(self):
        assert LTRTrainer.DEFAULT_CONFIG is not None
        assert LTRTrainer.DEFAULT_CONFIG.objective == "lambdarank"


class TestPrepareTrainingData:
    @pytest.fixture
    def trainer(self):
        return LTRTrainer()

    def test_basic_preparation(self, trainer):
        impressions = [
            {"id": "imp1", "result_doc_ids": ["doc1", "doc2", "doc3"]},
        ]
        clicks = [
            {"impression_id": "imp1", "doc_id": "doc1", "position": 0},
        ]
        features_by_doc = {
            "doc1": np.array([0.1, 0.2], dtype=np.float32),
            "doc2": np.array([0.3, 0.4], dtype=np.float32),
            "doc3": np.array([0.5, 0.6], dtype=np.float32),
        }
        feature_names = ["f1", "f2"]

        X, y, groups = trainer.prepare_training_data(
            impressions, clicks, features_by_doc, feature_names
        )

        assert X.shape == (3, 2)
        assert len(y) == 3
        assert groups == [3]

    def test_skips_impressions_with_less_than_2_docs(self, trainer):
        impressions = [
            {"id": "imp1", "result_doc_ids": ["doc1"]},
        ]
        clicks = []
        features_by_doc = {
            "doc1": np.array([0.1, 0.2], dtype=np.float32),
        }
        feature_names = ["f1", "f2"]

        X, y, groups = trainer.prepare_training_data(
            impressions, clicks, features_by_doc, feature_names
        )

        assert len(X) == 0
        assert len(y) == 0
        assert len(groups) == 0

    def test_skips_docs_without_features(self, trainer):
        impressions = [
            {"id": "imp1", "result_doc_ids": ["doc1", "doc2", "doc_no_features"]},
        ]
        clicks = []
        features_by_doc = {
            "doc1": np.array([0.1, 0.2], dtype=np.float32),
            "doc2": np.array([0.3, 0.4], dtype=np.float32),
        }
        feature_names = ["f1", "f2"]

        X, y, groups = trainer.prepare_training_data(
            impressions, clicks, features_by_doc, feature_names
        )

        assert X.shape == (2, 2)
        assert groups == [2]

    def test_multiple_impressions(self, trainer):
        impressions = [
            {"id": "imp1", "result_doc_ids": ["doc1", "doc2"]},
            {"id": "imp2", "result_doc_ids": ["doc3", "doc4"]},
        ]
        clicks = [
            {"impression_id": "imp1", "doc_id": "doc1", "position": 0},
            {"impression_id": "imp2", "doc_id": "doc4", "position": 1},
        ]
        features_by_doc = {
            "doc1": np.array([0.1], dtype=np.float32),
            "doc2": np.array([0.2], dtype=np.float32),
            "doc3": np.array([0.3], dtype=np.float32),
            "doc4": np.array([0.4], dtype=np.float32),
        }
        feature_names = ["f1"]

        X, y, groups = trainer.prepare_training_data(
            impressions, clicks, features_by_doc, feature_names
        )

        assert X.shape == (4, 1)
        assert groups == [2, 2]

    def test_click_with_dwell_time_and_feedback(self, trainer):
        impressions = [
            {"id": "imp1", "result_doc_ids": ["doc1", "doc2"]},
        ]
        clicks = [
            {
                "impression_id": "imp1",
                "doc_id": "doc1",
                "position": 0,
                "dwell_time_ms": 30000,
                "feedback_type": "like",
            },
        ]
        features_by_doc = {
            "doc1": np.array([0.1], dtype=np.float32),
            "doc2": np.array([0.2], dtype=np.float32),
        }
        feature_names = ["f1"]

        X, y, groups = trainer.prepare_training_data(
            impressions, clicks, features_by_doc, feature_names
        )

        assert y[0] > y[1]

    def test_empty_impressions(self, trainer):
        X, y, groups = trainer.prepare_training_data([], [], {}, [])

        assert len(X) == 0
        assert len(y) == 0
        assert len(groups) == 0


class TestTrain:
    @pytest.fixture
    def trainer(self):
        return LTRTrainer(TrainingConfig(num_boost_round=10, early_stopping_rounds=5))

    @pytest.fixture
    def mock_lgb_train(self):
        mock_model = MagicMock()
        mock_model.best_iteration = 10
        mock_model.best_score = {"valid": {"ndcg@10": 0.85}}
        mock_model.feature_importance.return_value = np.array([100.0, 50.0, 25.0])
        return mock_model

    def test_train_returns_training_result(self, trainer, mock_lgb_train):
        X = np.array([[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]] * 10, dtype=np.float32)
        y = np.array([1.0, 0.0] * 10, dtype=np.float32)
        groups = [2] * 10
        feature_names = ["f1", "f2", "f3"]

        with (
            patch("engine.ltr.trainer.logger"),
            patch("engine.ltr.trainer.lgb.train", return_value=mock_lgb_train),
            patch("engine.ltr.trainer.lgb.Dataset"),
        ):
            result = trainer.train(X, y, groups, feature_names)

        assert isinstance(result, TrainingResult)
        assert result.model is mock_lgb_train
        assert result.num_queries == len(groups)
        assert result.num_documents == len(y)
        assert result.training_time_seconds > 0

    def test_train_computes_feature_importance(self, trainer, mock_lgb_train):
        X = np.array([[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]] * 10, dtype=np.float32)
        y = np.array([1.0, 0.0] * 10, dtype=np.float32)
        groups = [2] * 10
        feature_names = ["f1", "f2", "f3"]

        with (
            patch("engine.ltr.trainer.logger"),
            patch("engine.ltr.trainer.lgb.train", return_value=mock_lgb_train),
            patch("engine.ltr.trainer.lgb.Dataset"),
        ):
            result = trainer.train(X, y, groups, feature_names)

        assert len(result.feature_importance) == len(feature_names)
        for name in feature_names:
            assert name in result.feature_importance

    def test_train_computes_metrics(self, trainer, mock_lgb_train):
        X = np.array([[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]] * 10, dtype=np.float32)
        y = np.array([1.0, 0.0] * 10, dtype=np.float32)
        groups = [2] * 10
        feature_names = ["f1", "f2", "f3"]

        with (
            patch("engine.ltr.trainer.logger"),
            patch("engine.ltr.trainer.lgb.train", return_value=mock_lgb_train),
            patch("engine.ltr.trainer.lgb.Dataset"),
        ):
            result = trainer.train(X, y, groups, feature_names)

        assert "best_iteration" in result.metrics
        assert "best_ndcg" in result.metrics
        assert result.metrics["best_ndcg"] == 0.85

    def test_train_with_custom_validation_split(self, trainer, mock_lgb_train):
        X = np.array([[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]] * 10, dtype=np.float32)
        y = np.array([1.0, 0.0] * 10, dtype=np.float32)
        groups = [2] * 10
        feature_names = ["f1", "f2", "f3"]

        with (
            patch("engine.ltr.trainer.logger"),
            patch("engine.ltr.trainer.lgb.train", return_value=mock_lgb_train),
            patch("engine.ltr.trainer.lgb.Dataset"),
        ):
            result = trainer.train(X, y, groups, feature_names, validation_split=0.2)

        assert isinstance(result, TrainingResult)

    def test_train_logs_completion(self, trainer, mock_lgb_train):
        X = np.array([[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]] * 10, dtype=np.float32)
        y = np.array([1.0, 0.0] * 10, dtype=np.float32)
        groups = [2] * 10
        feature_names = ["f1", "f2", "f3"]

        with (
            patch("engine.ltr.trainer.logger") as mock_logger,
            patch("engine.ltr.trainer.lgb.train", return_value=mock_lgb_train),
            patch("engine.ltr.trainer.lgb.Dataset"),
        ):
            trainer.train(X, y, groups, feature_names)

            mock_logger.info.assert_called()
            call_args = mock_logger.info.call_args
            assert call_args[0][0] == "ltr_training_completed"

    def test_train_creates_datasets_correctly(self, trainer, mock_lgb_train):
        X = np.array([[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]] * 10, dtype=np.float32)
        y = np.array([1.0, 0.0] * 10, dtype=np.float32)
        groups = [2] * 10
        feature_names = ["f1", "f2", "f3"]

        with (
            patch("engine.ltr.trainer.logger"),
            patch("engine.ltr.trainer.lgb.train", return_value=mock_lgb_train),
            patch("engine.ltr.trainer.lgb.Dataset") as mock_dataset,
        ):
            trainer.train(X, y, groups, feature_names)

            assert mock_dataset.call_count == 2


class TestSaveModel:
    @pytest.fixture
    def trainer(self):
        return LTRTrainer()

    @pytest.fixture
    def mock_result(self):
        mock_model = MagicMock()
        return TrainingResult(
            model=mock_model,
            metrics={"best_ndcg": 0.85, "best_iteration": 100},
            feature_importance={"f1": 100.0, "f2": 50.0},
            training_time_seconds=10.5,
            num_queries=100,
            num_documents=1000,
        )

    def test_save_model_creates_directory(self, trainer, mock_result, tmp_path):
        version = "v1.0.0"

        with patch("engine.ltr.trainer.logger"):
            result_path = trainer.save_model(mock_result, tmp_path, version)

        assert result_path.exists()
        assert result_path == tmp_path / version

    def test_save_model_saves_model_file(self, trainer, mock_result, tmp_path):
        version = "v1.0.0"

        with patch("engine.ltr.trainer.logger"):
            trainer.save_model(mock_result, tmp_path, version)

        mock_result.model.save_model.assert_called_once()
        call_args = mock_result.model.save_model.call_args[0][0]
        assert "model.txt" in call_args

    def test_save_model_saves_metadata(self, trainer, mock_result, tmp_path):
        import json

        version = "v1.0.0"

        with patch("engine.ltr.trainer.logger"):
            result_path = trainer.save_model(mock_result, tmp_path, version)

        metadata_path = result_path / "metadata.json"
        assert metadata_path.exists()

        with open(metadata_path) as f:
            metadata = json.load(f)

        assert metadata["version"] == version
        assert metadata["metrics"] == mock_result.metrics
        assert metadata["feature_importance"] == mock_result.feature_importance
        assert metadata["training_time_seconds"] == mock_result.training_time_seconds
        assert metadata["num_queries"] == mock_result.num_queries
        assert metadata["num_documents"] == mock_result.num_documents

    def test_save_model_logs_save_event(self, trainer, mock_result, tmp_path):
        version = "v1.0.0"

        with patch("engine.ltr.trainer.logger") as mock_logger:
            trainer.save_model(mock_result, tmp_path, version)

            mock_logger.info.assert_called_once()
            call_args = mock_logger.info.call_args
            assert call_args[0][0] == "ltr_model_saved"
            assert call_args[1]["version"] == version


class TestTrainLambdamart:
    def test_orchestrates_training(self):
        impressions = [
            {"id": "imp1", "result_doc_ids": ["doc1", "doc2"]},
        ]
        clicks = [
            {"impression_id": "imp1", "doc_id": "doc1", "position": 0},
        ]
        features_by_doc = {
            "doc1": np.array([0.1, 0.2], dtype=np.float32),
            "doc2": np.array([0.3, 0.4], dtype=np.float32),
        }
        feature_names = ["f1", "f2"]

        with (
            patch.object(LTRTrainer, "prepare_training_data") as mock_prepare,
            patch.object(LTRTrainer, "train") as mock_train,
        ):
            mock_prepare.return_value = (
                np.array([[0.1, 0.2], [0.3, 0.4]]),
                np.array([1.0, 0.0]),
                [2],
            )
            mock_train.return_value = MagicMock(spec=TrainingResult)

            result = train_lambdamart(
                impressions, clicks, features_by_doc, feature_names
            )

            mock_prepare.assert_called_once_with(
                impressions, clicks, features_by_doc, feature_names
            )
            mock_train.assert_called_once()
            assert result is mock_train.return_value

    def test_accepts_custom_config(self):
        config = TrainingConfig(num_leaves=15)

        with (
            patch.object(LTRTrainer, "prepare_training_data") as mock_prepare,
            patch.object(LTRTrainer, "train") as mock_train,
        ):
            mock_prepare.return_value = (np.array([[]]), np.array([]), [])
            mock_train.return_value = MagicMock(spec=TrainingResult)

            train_lambdamart([], [], {}, [], config=config)

            mock_train.assert_called_once()
