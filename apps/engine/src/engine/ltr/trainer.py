from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import lightgbm as lgb
import numpy as np
import structlog

from .click_model import ClickSignal, compute_relevance_label

logger = structlog.get_logger()


@dataclass
class TrainingConfig:
    objective: str = "lambdarank"
    metric: str = "ndcg"
    ndcg_eval_at: list[int] = field(default_factory=lambda: [5, 10, 20])
    num_leaves: int = 31
    learning_rate: float = 0.05
    min_data_in_leaf: int = 20
    feature_fraction: float = 0.8
    bagging_fraction: float = 0.8
    bagging_freq: int = 5
    num_boost_round: int = 500
    early_stopping_rounds: int = 50
    verbose: int = -1


@dataclass
class TrainingResult:
    model: lgb.Booster
    metrics: dict[str, float]
    feature_importance: dict[str, float]
    training_time_seconds: float
    num_queries: int
    num_documents: int


class LTRTrainer:
    DEFAULT_CONFIG = TrainingConfig()

    def __init__(self, config: TrainingConfig | None = None) -> None:
        self._config = config or self.DEFAULT_CONFIG

    def prepare_training_data(
        self,
        impressions: list[dict[str, Any]],
        clicks: list[dict[str, Any]],
        features_by_doc: dict[str, np.ndarray],
        feature_names: list[str],
    ) -> tuple[np.ndarray, np.ndarray, list[int]]:
        click_map: dict[str, dict[str, ClickSignal]] = {}
        for click in clicks:
            impression_id = click["impression_id"]
            if impression_id not in click_map:
                click_map[impression_id] = {}
            click_map[impression_id][click["doc_id"]] = ClickSignal(
                position=click["position"],
                was_clicked=True,
                dwell_time_ms=click.get("dwell_time_ms"),
                feedback_type=click.get("feedback_type"),
            )

        all_features: list[np.ndarray] = []
        all_labels: list[float] = []
        group_sizes: list[int] = []

        for impression in impressions:
            impression_id = impression["id"]
            doc_ids = impression["result_doc_ids"]
            impression_clicks = click_map.get(impression_id, {})

            query_features: list[np.ndarray] = []
            query_labels: list[float] = []

            for position, doc_id in enumerate(doc_ids):
                if doc_id not in features_by_doc:
                    continue

                if doc_id in impression_clicks:
                    signal = impression_clicks[doc_id]
                else:
                    signal = ClickSignal(
                        position=position,
                        was_clicked=False,
                        dwell_time_ms=None,
                        feedback_type=None,
                    )

                relevance = compute_relevance_label(signal)
                query_features.append(features_by_doc[doc_id])
                query_labels.append(relevance)

            if len(query_features) >= 2:
                all_features.extend(query_features)
                all_labels.extend(query_labels)
                group_sizes.append(len(query_features))

        X = np.array(all_features, dtype=np.float32)
        y = np.array(all_labels, dtype=np.float32)

        return X, y, group_sizes

    def train(
        self,
        X: np.ndarray,
        y: np.ndarray,
        groups: list[int],
        feature_names: list[str],
        validation_split: float = 0.1,
    ) -> TrainingResult:
        start_time = time.perf_counter()

        split_idx = int(len(groups) * (1 - validation_split))
        train_end = sum(groups[:split_idx])

        X_train, X_val = X[:train_end], X[train_end:]
        y_train, y_val = y[:train_end], y[train_end:]
        groups_train, groups_val = groups[:split_idx], groups[split_idx:]

        train_dataset = lgb.Dataset(
            X_train,
            label=y_train,
            group=groups_train,
            feature_name=feature_names,
        )

        val_dataset = lgb.Dataset(
            X_val,
            label=y_val,
            group=groups_val,
            reference=train_dataset,
        )

        params = {
            "objective": self._config.objective,
            "metric": self._config.metric,
            "ndcg_eval_at": self._config.ndcg_eval_at,
            "num_leaves": self._config.num_leaves,
            "learning_rate": self._config.learning_rate,
            "min_data_in_leaf": self._config.min_data_in_leaf,
            "feature_fraction": self._config.feature_fraction,
            "bagging_fraction": self._config.bagging_fraction,
            "bagging_freq": self._config.bagging_freq,
            "verbose": self._config.verbose,
        }

        model = lgb.train(
            params,
            train_dataset,
            num_boost_round=self._config.num_boost_round,
            valid_sets=[train_dataset, val_dataset],
            valid_names=["train", "valid"],
            callbacks=[
                lgb.early_stopping(self._config.early_stopping_rounds),
                lgb.log_evaluation(period=50),
            ],
        )

        importance = model.feature_importance(importance_type="gain")
        feature_importance = dict(zip(feature_names, importance.tolist(), strict=True))

        training_time = time.perf_counter() - start_time

        metrics = {
            "best_iteration": float(model.best_iteration),
            "best_ndcg": model.best_score.get("valid", {}).get("ndcg@10", 0.0),
        }

        logger.info(
            "ltr_training_completed",
            num_queries=len(groups),
            num_documents=len(y),
            training_time_seconds=round(training_time, 2),
            best_ndcg=metrics["best_ndcg"],
            best_iteration=metrics["best_iteration"],
        )

        return TrainingResult(
            model=model,
            metrics=metrics,
            feature_importance=feature_importance,
            training_time_seconds=training_time,
            num_queries=len(groups),
            num_documents=len(y),
        )

    def save_model(
        self,
        result: TrainingResult,
        path: Path,
        version: str,
    ) -> Path:
        model_dir = path / version
        model_dir.mkdir(parents=True, exist_ok=True)

        model_path = model_dir / "model.txt"
        result.model.save_model(str(model_path))

        metadata = {
            "version": version,
            "metrics": result.metrics,
            "feature_importance": result.feature_importance,
            "training_time_seconds": result.training_time_seconds,
            "num_queries": result.num_queries,
            "num_documents": result.num_documents,
        }

        metadata_path = model_dir / "metadata.json"
        with open(metadata_path, "w") as f:
            json.dump(metadata, f, indent=2)

        logger.info(
            "ltr_model_saved",
            version=version,
            path=str(model_dir),
        )

        return model_dir


def train_lambdamart(
    impressions: list[dict[str, Any]],
    clicks: list[dict[str, Any]],
    features_by_doc: dict[str, np.ndarray],
    feature_names: list[str],
    config: TrainingConfig | None = None,
) -> TrainingResult:
    trainer = LTRTrainer(config)
    X, y, groups = trainer.prepare_training_data(
        impressions, clicks, features_by_doc, feature_names
    )
    return trainer.train(X, y, groups, feature_names)
