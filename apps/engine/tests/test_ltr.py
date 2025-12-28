from __future__ import annotations

import numpy as np
import pytest

from engine.ltr.click_model import (
    ClickSignal,
    RelevanceGrade,
    apply_position_bias_correction,
    compute_relevance_label,
)
from engine.ltr.features import (
    CONNECTOR_TYPE_MAP,
    DOCUMENT_TYPE_MAP,
    FEATURE_NAMES,
    LTRFeatureExtractor,
)
from engine.ltr.trainer import LTRTrainer, TrainingConfig
from engine.models.ltr import DocumentFeatures, UserContext


class TestClickModel:
    def test_helpful_feedback_returns_perfect(self):
        signal = ClickSignal(
            position=0,
            was_clicked=True,
            dwell_time_ms=5000,
            feedback_type="helpful",
        )
        assert compute_relevance_label(signal) == float(RelevanceGrade.PERFECT)

    def test_not_helpful_feedback_returns_not_relevant(self):
        signal = ClickSignal(
            position=0,
            was_clicked=True,
            dwell_time_ms=5000,
            feedback_type="not_helpful",
        )
        assert compute_relevance_label(signal) == float(RelevanceGrade.NOT_RELEVANT)

    def test_no_click_returns_zero(self):
        signal = ClickSignal(
            position=3,
            was_clicked=False,
            dwell_time_ms=None,
            feedback_type=None,
        )
        assert compute_relevance_label(signal) == 0.0

    def test_click_no_dwell_returns_marginal(self):
        signal = ClickSignal(
            position=0,
            was_clicked=True,
            dwell_time_ms=None,
            feedback_type=None,
        )
        assert compute_relevance_label(signal) == float(RelevanceGrade.MARGINAL)

    def test_long_dwell_returns_highly_relevant(self):
        signal = ClickSignal(
            position=0,
            was_clicked=True,
            dwell_time_ms=30000,
            feedback_type=None,
        )
        assert compute_relevance_label(signal) == float(RelevanceGrade.HIGHLY_RELEVANT)

    def test_medium_dwell_returns_relevant(self):
        signal = ClickSignal(
            position=0,
            was_clicked=True,
            dwell_time_ms=15000,
            feedback_type=None,
        )
        assert compute_relevance_label(signal) == float(RelevanceGrade.RELEVANT)

    def test_short_dwell_returns_marginal(self):
        signal = ClickSignal(
            position=0,
            was_clicked=True,
            dwell_time_ms=5000,
            feedback_type=None,
        )
        assert compute_relevance_label(signal) == float(RelevanceGrade.MARGINAL)


class TestPositionBiasCorrection:
    def test_position_zero_no_correction(self):
        result = apply_position_bias_correction(2.0, 0)
        assert result == 2.0

    def test_lower_position_higher_correction(self):
        relevance = 2.0
        pos_0 = apply_position_bias_correction(relevance, 0)
        pos_5 = apply_position_bias_correction(relevance, 5)
        assert pos_5 > pos_0

    def test_position_beyond_list_uses_default(self):
        result = apply_position_bias_correction(2.0, 100)
        assert result == 2.0 / 0.02

    def test_custom_examination_probs(self):
        custom_probs = [1.0, 0.5, 0.25]
        result = apply_position_bias_correction(2.0, 1, custom_probs)
        assert result == 2.0 / 0.5


class TestLTRFeatureExtractor:
    @pytest.fixture
    def extractor(self):
        return LTRFeatureExtractor()

    @pytest.fixture
    def sample_doc(self):
        return DocumentFeatures(
            doc_id="doc_1",
            bm25_title=0.8,
            bm25_content=0.6,
            dense_score=0.75,
            sparse_score=0.5,
            rerank_score=0.9,
            recency_days=7,
            doc_length=1500,
            title_length=50,
            view_count=100,
            reaction_count=10,
            reply_count=5,
            trending_score=0.3,
            authority_score=0.7,
            title_exact_match=True,
            title_partial_match=True,
            connector_type="linear",
            document_type="issue",
            department_match=True,
            author_id="user_123",
        )

    def test_feature_count_matches_names(self, extractor):
        assert extractor.feature_count == len(FEATURE_NAMES)

    def test_feature_names_accessible(self, extractor):
        assert extractor.feature_names == FEATURE_NAMES

    def test_extract_returns_correct_shape(self, extractor, sample_doc):
        features = extractor.extract(sample_doc, "test query")
        assert features.shape == (len(FEATURE_NAMES),)
        assert features.dtype == np.float32

    def test_extract_score_features(self, extractor, sample_doc):
        features = extractor.extract(sample_doc, "test query")
        assert features[0] == 0.8  # bm25_title
        assert features[1] == 0.6  # bm25_content
        assert features[2] == 0.75  # dense_score
        assert features[3] == 0.5  # sparse_score
        assert features[4] == 0.9  # rerank_score

    def test_extract_normalizes_lengths(self, extractor, sample_doc):
        features = extractor.extract(sample_doc, "test query")
        assert features[6] == 1500 / 100000.0  # doc_length normalized
        assert features[7] == 50 / 200.0  # title_length normalized

    def test_extract_log_transforms_counts(self, extractor, sample_doc):
        features = extractor.extract(sample_doc, "test query")
        assert np.isclose(features[8], np.log1p(100))  # view_count
        assert np.isclose(features[9], np.log1p(10))  # reaction_count
        assert np.isclose(features[10], np.log1p(5))  # reply_count

    def test_extract_boolean_to_float(self, extractor, sample_doc):
        features = extractor.extract(sample_doc, "test query")
        assert features[13] == 1.0  # title_exact_match
        assert features[14] == 1.0  # title_partial_match

    def test_extract_connector_type_encoding(self, extractor, sample_doc):
        features = extractor.extract(sample_doc, "test query")
        assert features[15] == CONNECTOR_TYPE_MAP["linear"]

    def test_extract_document_type_encoding(self, extractor, sample_doc):
        features = extractor.extract(sample_doc, "test query")
        assert features[16] == DOCUMENT_TYPE_MAP["issue"]

    def test_extract_with_user_context(self, extractor, sample_doc):
        user_context = UserContext(
            user_id="user_1",
            team_id="team_1",
            department="engineering",
            author_interactions={"user_123": 5},
        )
        features = extractor.extract(sample_doc, "test query", user_context)
        assert features[17] == 1.0  # department_match
        assert np.isclose(features[18], np.log1p(5))  # author_interaction_count

    def test_extract_without_user_context(self, extractor, sample_doc):
        features = extractor.extract(sample_doc, "test query", None)
        assert features[17] == 0.0  # department_match
        assert features[18] == 0.0  # author_interaction_count

    def test_extract_batch(self, extractor, sample_doc):
        docs = [sample_doc, sample_doc]
        features = extractor.extract_batch(docs, "test query")
        assert features.shape == (2, len(FEATURE_NAMES))
        assert features.dtype == np.float32

    def test_unknown_connector_type(self, extractor):
        doc = DocumentFeatures(doc_id="doc_1", connector_type="unknown_app")
        features = extractor.extract(doc, "test query")
        assert features[15] == -1

    def test_unknown_document_type(self, extractor):
        doc = DocumentFeatures(doc_id="doc_1", document_type="unknown_type")
        features = extractor.extract(doc, "test query")
        assert features[16] == -1


class TestLTRTrainer:
    @pytest.fixture
    def trainer(self):
        return LTRTrainer()

    @pytest.fixture
    def sample_impressions(self):
        return [
            {"id": "imp_1", "result_doc_ids": ["doc_1", "doc_2", "doc_3"]},
            {"id": "imp_2", "result_doc_ids": ["doc_2", "doc_3", "doc_4"]},
        ]

    @pytest.fixture
    def sample_clicks(self):
        return [
            {"impression_id": "imp_1", "doc_id": "doc_1", "position": 0, "dwell_time_ms": 15000},
            {"impression_id": "imp_2", "doc_id": "doc_3", "position": 1, "dwell_time_ms": 35000},
        ]

    @pytest.fixture
    def sample_features(self):
        return {
            "doc_1": np.array([0.1] * 19, dtype=np.float32),
            "doc_2": np.array([0.2] * 19, dtype=np.float32),
            "doc_3": np.array([0.3] * 19, dtype=np.float32),
            "doc_4": np.array([0.4] * 19, dtype=np.float32),
        }

    def test_prepare_training_data_shape(self, trainer, sample_impressions, sample_clicks, sample_features):
        X, y, groups = trainer.prepare_training_data(
            sample_impressions,
            sample_clicks,
            sample_features,
            FEATURE_NAMES,
        )
        assert X.dtype == np.float32
        assert y.dtype == np.float32
        assert len(groups) == 2
        assert X.shape[0] == sum(groups)
        assert y.shape[0] == sum(groups)

    def test_prepare_training_data_labels(self, trainer, sample_impressions, sample_clicks, sample_features):
        X, y, groups = trainer.prepare_training_data(
            sample_impressions,
            sample_clicks,
            sample_features,
            FEATURE_NAMES,
        )
        assert y[0] == float(RelevanceGrade.RELEVANT)  # doc_1 clicked with 15s dwell
        assert y[1] == 0.0  # doc_2 not clicked in imp_1

    def test_prepare_training_data_skips_missing_docs(self, trainer, sample_impressions, sample_clicks):
        features = {"doc_1": np.array([0.1] * 19, dtype=np.float32)}
        X, y, groups = trainer.prepare_training_data(
            sample_impressions,
            sample_clicks,
            features,
            FEATURE_NAMES,
        )
        assert len(groups) == 0

    def test_training_config_defaults(self):
        config = TrainingConfig()
        assert config.objective == "lambdarank"
        assert config.metric == "ndcg"
        assert config.num_leaves == 31
        assert config.learning_rate == 0.05

    def test_train_requires_minimum_data(self, trainer, sample_features):
        impressions = [{"id": "imp_1", "result_doc_ids": ["doc_1", "doc_2"]}]
        clicks = [{"impression_id": "imp_1", "doc_id": "doc_1", "position": 0}]

        X, y, groups = trainer.prepare_training_data(
            impressions,
            clicks,
            sample_features,
            FEATURE_NAMES,
        )

        assert len(groups) >= 1


class TestConnectorAndDocumentTypeMaps:
    def test_connector_type_map_coverage(self):
        expected_connectors = {"linear", "slack", "notion", "google_drive", "gmail", "github", "jira", "confluence", "unknown"}
        assert set(CONNECTOR_TYPE_MAP.keys()) == expected_connectors

    def test_document_type_map_coverage(self):
        expected_types = {"issue", "message", "document", "file", "email", "page", "pull_request", "comment", "unknown"}
        assert set(DOCUMENT_TYPE_MAP.keys()) == expected_types

    def test_connector_type_unique_values(self):
        values = list(CONNECTOR_TYPE_MAP.values())
        non_negative = [v for v in values if v >= 0]
        assert len(non_negative) == len(set(non_negative))

    def test_document_type_unique_values(self):
        values = list(DOCUMENT_TYPE_MAP.values())
        non_negative = [v for v in values if v >= 0]
        assert len(non_negative) == len(set(non_negative))
