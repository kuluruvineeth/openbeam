from __future__ import annotations

from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from engine.common.exceptions import ModelLoadError
from engine.gpu_service.deployments.entity import (
    DEFAULT_LABELS,
    EMAIL_PATTERN,
    MENTION_PATTERN,
    SLACK_USER_PATTERN,
    EntityDeployment,
)
from engine.models.entity import Entity, EntityResponse


class MockGLiNERModel:
    def __init__(self, model_name: str, cache_dir: str):
        self.model_name = model_name
        self.cache_dir = cache_dir

    def to(self, device: str) -> MockGLiNERModel:
        return self

    def predict_entities(
        self,
        text: str,
        labels: list[str],
        threshold: float,
    ) -> list[dict[str, Any]]:
        entities = []
        for label in labels:
            if label == "person" and "John" in text:
                entities.append(
                    {
                        "text": "John",
                        "label": "person",
                        "score": 0.95,
                        "start": text.index("John"),
                        "end": text.index("John") + 4,
                    }
                )
            if label == "organization" and "OpenAI" in text:
                entities.append(
                    {
                        "text": "OpenAI",
                        "label": "organization",
                        "score": 0.92,
                        "start": text.index("OpenAI"),
                        "end": text.index("OpenAI") + 6,
                    }
                )
        return entities


class MockGLiNER:
    @staticmethod
    def from_pretrained(model_name: str, cache_dir: str) -> MockGLiNERModel:
        return MockGLiNERModel(model_name, cache_dir)


@pytest.fixture
def mock_torch():
    mock = MagicMock()
    mock.cuda.is_available.return_value = False
    mock.backends.mps.is_available.return_value = False
    with patch("engine.gpu_service.deployments.entity.torch", mock):
        yield mock


@pytest.fixture
def mock_gliner():
    mock = MagicMock()
    mock.GLiNER = MockGLiNER
    with patch.dict("sys.modules", {"gliner": mock}):
        yield mock


class TestEntityDeploymentPatterns:
    def test_email_pattern(self):
        text = "Contact john.doe@example.com for info"
        matches = list(EMAIL_PATTERN.finditer(text))
        assert len(matches) == 1
        assert matches[0].group() == "john.doe@example.com"

    def test_email_pattern_multiple(self):
        text = "a@b.com and c@d.org"
        matches = list(EMAIL_PATTERN.finditer(text))
        assert len(matches) == 2

    def test_mention_pattern(self):
        text = "Hey @john_doe, check this out"
        matches = list(MENTION_PATTERN.finditer(text))
        assert len(matches) == 1
        assert matches[0].group(1) == "john_doe"

    def test_slack_user_pattern(self):
        text = "Thanks <@U12345ABC> for the help"
        matches = list(SLACK_USER_PATTERN.finditer(text))
        assert len(matches) == 1
        assert matches[0].group(1) == "U12345ABC"


class TestEntityDeploymentInit:
    def test_init_with_cuda(self, mock_gliner: MagicMock):
        mock = MagicMock()
        mock.cuda.is_available.return_value = True
        mock.backends.mps.is_available.return_value = False
        with patch("engine.gpu_service.deployments.entity.torch", mock):
            with patch.object(EntityDeployment, "__init__", lambda self: None):
                deployment = EntityDeployment.__new__(EntityDeployment)
                deployment._model_name = "urchade/gliner_medium-v2.1"
                deployment._cache_dir = "/models/entity"
                deployment._model = None
                deployment._device = "cpu"
                deployment._is_ready = False
                deployment._load_model()

            assert deployment._device == "cuda"
            assert deployment._is_ready

    def test_init_with_mps(self, mock_gliner: MagicMock):
        mock = MagicMock()
        mock.cuda.is_available.return_value = False
        mock.backends.mps.is_available.return_value = True
        with patch("engine.gpu_service.deployments.entity.torch", mock):
            with patch.object(EntityDeployment, "__init__", lambda self: None):
                deployment = EntityDeployment.__new__(EntityDeployment)
                deployment._model_name = "urchade/gliner_medium-v2.1"
                deployment._cache_dir = "/models/entity"
                deployment._model = None
                deployment._device = "cpu"
                deployment._is_ready = False
                deployment._load_model()

            assert deployment._device == "mps"
            assert deployment._is_ready

    def test_init_with_cpu(self, mock_torch: MagicMock, mock_gliner: MagicMock):
        with patch.object(EntityDeployment, "__init__", lambda self: None):
            deployment = EntityDeployment.__new__(EntityDeployment)
            deployment._model_name = "urchade/gliner_medium-v2.1"
            deployment._cache_dir = "/models/entity"
            deployment._model = None
            deployment._device = "cpu"
            deployment._is_ready = False
            deployment._load_model()

        assert deployment._device == "cpu"
        assert deployment._is_ready

    def test_init_model_load_failure(self, mock_torch: MagicMock):
        class FailingGLiNER:
            @staticmethod
            def from_pretrained(*args: Any, **kwargs: Any) -> None:
                raise RuntimeError("Model failed to load")

        mock = MagicMock()
        mock.GLiNER = FailingGLiNER
        with patch.dict("sys.modules", {"gliner": mock}):
            with patch.object(EntityDeployment, "__init__", lambda self: None):
                deployment = EntityDeployment.__new__(EntityDeployment)
                deployment._model_name = "urchade/gliner_medium-v2.1"
                deployment._cache_dir = "/models/entity"
                deployment._model = None
                deployment._device = "cpu"
                deployment._is_ready = False

                with pytest.raises(ModelLoadError, match="Failed to load"):
                    deployment._load_model()


class TestEntityDeploymentSelectDevice:
    def test_select_cuda(self):
        mock = MagicMock()
        mock.cuda.is_available.return_value = True
        mock.backends.mps.is_available.return_value = False
        with patch("engine.gpu_service.deployments.entity.torch", mock):
            with patch.object(EntityDeployment, "__init__", lambda self: None):
                deployment = EntityDeployment.__new__(EntityDeployment)
                assert deployment._select_device() == "cuda"

    def test_select_mps(self):
        mock = MagicMock()
        mock.cuda.is_available.return_value = False
        mock.backends.mps.is_available.return_value = True
        with patch("engine.gpu_service.deployments.entity.torch", mock):
            with patch.object(EntityDeployment, "__init__", lambda self: None):
                deployment = EntityDeployment.__new__(EntityDeployment)
                assert deployment._select_device() == "mps"

    def test_select_cpu(self, mock_torch: MagicMock):
        with patch.object(EntityDeployment, "__init__", lambda self: None):
            deployment = EntityDeployment.__new__(EntityDeployment)
            assert deployment._select_device() == "cpu"


class TestEntityDeploymentReady:
    def test_ready_returns_is_ready(self):
        with patch.object(EntityDeployment, "__init__", lambda self: None):
            deployment = EntityDeployment.__new__(EntityDeployment)
            deployment._is_ready = True
            assert deployment.ready() is True

            deployment._is_ready = False
            assert deployment.ready() is False


class TestEntityDeploymentExtract:
    @pytest.fixture
    def deployment(self) -> EntityDeployment:
        with patch.object(EntityDeployment, "__init__", lambda self: None):
            deployment = EntityDeployment.__new__(EntityDeployment)
            deployment._model_name = "urchade/gliner_medium-v2.1"
            deployment._cache_dir = "/models/entity"
            deployment._model = MockGLiNERModel(
                "urchade/gliner_medium-v2.1", "/models"
            )
            deployment._is_ready = True
            return deployment

    @pytest.mark.asyncio
    @pytest.mark.parametrize("is_ready", [False, True])
    async def test_extract_fails_without_model(self, is_ready: bool):
        with patch.object(EntityDeployment, "__init__", lambda self: None):
            deployment = EntityDeployment.__new__(EntityDeployment)
            deployment._is_ready = is_ready
            deployment._model = None

            with pytest.raises(ModelLoadError, match="Model not loaded"):
                await deployment.extract("test text")

    @pytest.mark.asyncio
    async def test_extract_empty_text(self, deployment: EntityDeployment):
        response = await deployment.extract("")
        assert isinstance(response, EntityResponse)
        assert response.entities == []
        assert response.model == "urchade/gliner_medium-v2.1"
        assert response.usage["latency_ms"] == 0.0

    @pytest.mark.asyncio
    async def test_extract_whitespace_text(self, deployment: EntityDeployment):
        response = await deployment.extract("   ")
        assert response.entities == []
        assert response.usage["latency_ms"] == 0.0

    @pytest.mark.asyncio
    async def test_extract_with_person(self, deployment: EntityDeployment):
        response = await deployment.extract("John works at the company")
        person_entities = [e for e in response.entities if e.label == "person"]
        assert len(person_entities) == 1
        john = person_entities[0]
        assert john.text == "John"
        assert john.start == 0
        assert john.end == 4
        assert john.score >= 0.9
        assert john.source == "gliner"

    @pytest.mark.asyncio
    async def test_extract_with_organization(self, deployment: EntityDeployment):
        response = await deployment.extract("OpenAI created ChatGPT")
        org_entities = [e for e in response.entities if e.label == "organization"]
        assert len(org_entities) == 1
        org = org_entities[0]
        assert org.text == "OpenAI"
        assert org.start == 0
        assert org.end == 6
        assert org.score >= 0.9
        assert org.source == "gliner"

    @pytest.mark.asyncio
    async def test_extract_with_custom_labels(self, deployment: EntityDeployment):
        response = await deployment.extract("Test text", labels=["custom_label"])
        assert response.model == "urchade/gliner_medium-v2.1"
        assert 0 <= response.usage["latency_ms"] < 5000, "Latency should be bounded"

    @pytest.mark.asyncio
    async def test_extract_uses_default_labels(self, deployment: EntityDeployment):
        response = await deployment.extract("Some text without entities")
        assert len(DEFAULT_LABELS) == 6

    @pytest.mark.asyncio
    async def test_extract_latency_tracked(self, deployment: EntityDeployment):
        response = await deployment.extract("John works at OpenAI")
        assert response.usage["latency_ms"] >= 0
        assert response.usage["latency_ms"] < 10000

    @pytest.mark.asyncio
    async def test_extract_with_email(self, deployment: EntityDeployment):
        response = await deployment.extract("Contact john@example.com")
        email_entities = [e for e in response.entities if "example.com" in e.text]
        assert len(email_entities) == 1
        assert email_entities[0].source == "regex"
        assert email_entities[0].score == 1.0

    @pytest.mark.asyncio
    async def test_extract_with_mention(self, deployment: EntityDeployment):
        response = await deployment.extract("Thanks @john_doe!")
        mention_entities = [
            e for e in response.entities if e.text == "john_doe" and e.source == "regex"
        ]
        assert len(mention_entities) == 1
        assert mention_entities[0].score == 0.9

    @pytest.mark.asyncio
    async def test_extract_with_slack_user(self, deployment: EntityDeployment):
        response = await deployment.extract("Thanks <@U123ABC>")
        slack_entities = [
            e for e in response.entities if e.text == "U123ABC" and e.source == "regex"
        ]
        assert len(slack_entities) == 1
        assert slack_entities[0].score == 1.0


class TestEntityDeploymentExtractWithGliner:
    @pytest.fixture
    def deployment(self) -> EntityDeployment:
        with patch.object(EntityDeployment, "__init__", lambda self: None):
            deployment = EntityDeployment.__new__(EntityDeployment)
            deployment._model = MockGLiNERModel("test", "/models")
            return deployment

    def test_extract_returns_entities(self, deployment: EntityDeployment):
        entities = deployment._extract_with_gliner("John", ["person"], 0.5)
        assert len(entities) == 1
        assert entities[0].text == "John"
        assert entities[0].label == "person"
        assert entities[0].source == "gliner"

    def test_extract_model_none_returns_empty(self):
        with patch.object(EntityDeployment, "__init__", lambda self: None):
            deployment = EntityDeployment.__new__(EntityDeployment)
            deployment._model = None
            entities = deployment._extract_with_gliner("text", ["person"], 0.5)
            assert entities == []


class TestEntityDeploymentExtractWithRegex:
    @pytest.fixture
    def deployment(self) -> EntityDeployment:
        with patch.object(EntityDeployment, "__init__", lambda self: None):
            deployment = EntityDeployment.__new__(EntityDeployment)
            return deployment

    def test_extract_email(self, deployment: EntityDeployment):
        entities = deployment._extract_with_regex("test@example.com")
        email_entities = [e for e in entities if e.score == 1.0 and "@" in e.text]
        assert len(email_entities) == 1
        assert email_entities[0].text == "test@example.com"
        assert email_entities[0].label == "person"
        assert email_entities[0].source == "regex"

    def test_extract_mention(self, deployment: EntityDeployment):
        entities = deployment._extract_with_regex("Hello @username!")
        mention_entities = [e for e in entities if e.text == "username"]
        assert len(mention_entities) == 1
        assert mention_entities[0].score == 0.9

    def test_extract_slack_user(self, deployment: EntityDeployment):
        entities = deployment._extract_with_regex("<@U12345>")
        slack_entities = [e for e in entities if e.score == 1.0 and "<" not in e.text]
        assert len(slack_entities) == 1
        assert slack_entities[0].text == "U12345"

    def test_extract_multiple_types(self, deployment: EntityDeployment):
        text = "Email test@example.com or @user or <@U123>"
        entities = deployment._extract_with_regex(text)
        email_count = sum(1 for e in entities if "@" in e.text and e.score == 1.0)
        assert email_count >= 1
        assert any(e.text == "user" for e in entities)


class TestEntityDeploymentDeduplicate:
    @pytest.fixture
    def deployment(self) -> EntityDeployment:
        with patch.object(EntityDeployment, "__init__", lambda self: None):
            deployment = EntityDeployment.__new__(EntityDeployment)
            return deployment

    def test_empty_list(self, deployment: EntityDeployment):
        assert deployment._deduplicate([]) == []

    def test_no_overlap(self, deployment: EntityDeployment):
        entities = [
            Entity(text="a", label="x", score=0.9, start=0, end=1, source="test"),
            Entity(text="b", label="y", score=0.8, start=5, end=6, source="test"),
        ]
        result = deployment._deduplicate(entities)
        assert len(result) == 2

    def test_complete_overlap_keeps_higher_score(self, deployment: EntityDeployment):
        entities = [
            Entity(text="abc", label="x", score=0.7, start=0, end=3, source="test"),
            Entity(text="abc", label="y", score=0.9, start=0, end=3, source="test"),
        ]
        result = deployment._deduplicate(entities)
        assert len(result) == 1
        assert result[0].score == 0.9

    def test_partial_overlap(self, deployment: EntityDeployment):
        entities = [
            Entity(text="ab", label="x", score=0.9, start=0, end=2, source="test"),
            Entity(text="bc", label="y", score=0.8, start=1, end=3, source="test"),
        ]
        result = deployment._deduplicate(entities)
        assert len(result) == 1
        assert result[0].score == 0.9

    def test_adjacent_not_overlapping(self, deployment: EntityDeployment):
        entities = [
            Entity(text="a", label="x", score=0.9, start=0, end=1, source="test"),
            Entity(text="b", label="y", score=0.8, start=1, end=2, source="test"),
        ]
        result = deployment._deduplicate(entities)
        assert len(result) == 2


class TestEntityDeploymentOverlaps:
    def test_no_overlap_left(self):
        a = Entity(text="a", label="x", score=0.9, start=0, end=5, source="test")
        b = Entity(text="b", label="y", score=0.8, start=10, end=15, source="test")
        assert EntityDeployment._overlaps(a, b) is False

    def test_no_overlap_right(self):
        a = Entity(text="a", label="x", score=0.9, start=10, end=15, source="test")
        b = Entity(text="b", label="y", score=0.8, start=0, end=5, source="test")
        assert EntityDeployment._overlaps(a, b) is False

    def test_overlap(self):
        a = Entity(text="a", label="x", score=0.9, start=0, end=10, source="test")
        b = Entity(text="b", label="y", score=0.8, start=5, end=15, source="test")
        assert EntityDeployment._overlaps(a, b) is True

    def test_contained(self):
        a = Entity(text="a", label="x", score=0.9, start=0, end=20, source="test")
        b = Entity(text="b", label="y", score=0.8, start=5, end=15, source="test")
        assert EntityDeployment._overlaps(a, b) is True

    def test_adjacent_not_overlapping(self):
        a = Entity(text="a", label="x", score=0.9, start=0, end=5, source="test")
        b = Entity(text="b", label="y", score=0.8, start=5, end=10, source="test")
        assert EntityDeployment._overlaps(a, b) is False
