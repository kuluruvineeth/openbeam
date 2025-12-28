from __future__ import annotations

from typing import TYPE_CHECKING

import numpy as np

if TYPE_CHECKING:
    from engine.models.ltr import DocumentFeatures, UserContext

FEATURE_NAMES = [
    "bm25_title",
    "bm25_content",
    "dense_score",
    "sparse_score",
    "rerank_score",
    "recency_days",
    "doc_length",
    "title_length",
    "view_count",
    "reaction_count",
    "reply_count",
    "trending_score",
    "authority_score",
    "title_exact_match",
    "title_partial_match",
    "connector_type_encoded",
    "document_type_encoded",
    "department_match",
    "author_interaction_count",
]

CONNECTOR_TYPE_MAP = {
    "linear": 0,
    "slack": 1,
    "notion": 2,
    "google_drive": 3,
    "gmail": 4,
    "github": 5,
    "jira": 6,
    "confluence": 7,
    "unknown": -1,
}

DOCUMENT_TYPE_MAP = {
    "issue": 0,
    "message": 1,
    "document": 2,
    "file": 3,
    "email": 4,
    "page": 5,
    "pull_request": 6,
    "comment": 7,
    "unknown": -1,
}


class LTRFeatureExtractor:
    def __init__(self) -> None:
        self._feature_names = FEATURE_NAMES

    @property
    def feature_names(self) -> list[str]:
        return self._feature_names

    @property
    def feature_count(self) -> int:
        return len(self._feature_names)

    def extract(
        self,
        doc: DocumentFeatures,
        query: str,
        user_context: UserContext | None = None,
    ) -> np.ndarray:
        features = np.zeros(self.feature_count, dtype=np.float32)

        features[0] = doc.bm25_title
        features[1] = doc.bm25_content
        features[2] = doc.dense_score
        features[3] = doc.sparse_score
        features[4] = doc.rerank_score

        features[5] = float(doc.recency_days)
        features[6] = float(min(doc.doc_length, 100000)) / 100000.0
        features[7] = float(min(doc.title_length, 200)) / 200.0

        features[8] = np.log1p(doc.view_count)
        features[9] = np.log1p(doc.reaction_count)
        features[10] = np.log1p(doc.reply_count)
        features[11] = doc.trending_score
        features[12] = doc.authority_score

        features[13] = float(doc.title_exact_match)
        features[14] = float(doc.title_partial_match)

        features[15] = float(CONNECTOR_TYPE_MAP.get(doc.connector_type.lower(), -1))
        features[16] = float(DOCUMENT_TYPE_MAP.get(doc.document_type.lower(), -1))

        if user_context:
            features[17] = float(doc.department_match)
            author_id = doc.author_id
            if author_id and author_id in user_context.author_interactions:
                features[18] = np.log1p(user_context.author_interactions[author_id])
        else:
            features[17] = 0.0
            features[18] = 0.0

        return features

    def extract_batch(
        self,
        docs: list[DocumentFeatures],
        query: str,
        user_context: UserContext | None = None,
    ) -> np.ndarray:
        return np.array(
            [self.extract(doc, query, user_context) for doc in docs],
            dtype=np.float32,
        )


def extract_features(
    docs: list[DocumentFeatures],
    query: str,
    user_context: UserContext | None = None,
) -> np.ndarray:
    extractor = LTRFeatureExtractor()
    return extractor.extract_batch(docs, query, user_context)
