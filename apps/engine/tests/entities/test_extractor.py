from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from engine.entities.extractor import (
    EntityExtractor,
    ExtractedEntity,
    ModelLoadError,
)


class TestExtractedEntity:
    def test_dataclass_creation(self):
        entity = ExtractedEntity(
            text="John Smith",
            label="person",
            score=0.95,
            start=0,
            end=10,
            source="gliner",
        )
        assert entity.text == "John Smith"
        assert entity.label == "person"
        assert entity.score == 0.95
        assert entity.start == 0
        assert entity.end == 10
        assert entity.source == "gliner"


class TestModelLoadError:
    def test_exception_message(self):
        error = ModelLoadError("Failed to load model")
        assert str(error) == "Failed to load model"


class TestEntityExtractorSingleton:
    def test_get_instance_returns_same_instance(self):
        EntityExtractor._instance = None
        instance1 = EntityExtractor.get_instance()
        instance2 = EntityExtractor.get_instance()
        assert instance1 is instance2

    def test_get_instance_thread_safe(self):
        EntityExtractor._instance = None
        instance = EntityExtractor.get_instance()
        assert isinstance(instance, EntityExtractor)


class TestDeviceSelection:
    @pytest.mark.parametrize(
        "cuda_available,mps_available,expected_device",
        [
            (True, False, "cuda"),
            (True, True, "cuda"),
            (False, True, "mps"),
            (False, False, "cpu"),
        ],
        ids=["cuda-available", "cuda-preferred-over-mps", "mps-fallback", "cpu-fallback"],
    )
    def test_device_selection(self, cuda_available, mps_available, expected_device):
        with patch("torch.cuda.is_available", return_value=cuda_available):
            with patch("torch.backends.mps.is_available", return_value=mps_available):
                EntityExtractor._instance = None
                extractor = EntityExtractor()
                assert extractor.device == expected_device


class TestRegexExtraction:
    @pytest.fixture
    def extractor(self):
        EntityExtractor._instance = None
        with patch("torch.cuda.is_available", return_value=False):
            with patch("torch.backends.mps.is_available", return_value=False):
                return EntityExtractor()

    def test_extract_email(self, extractor):
        text = "Contact john@example.com for more info"
        entities = extractor._extract_with_regex(text)

        email_entities = [e for e in entities if e.text == "john@example.com"]
        assert len(email_entities) == 1
        assert email_entities[0].label == "person"
        assert email_entities[0].score == 1.0
        assert email_entities[0].source == "regex"

    def test_extract_multiple_emails(self, extractor):
        text = "john@example.com and jane@test.org are on the team"
        entities = extractor._extract_with_regex(text)

        emails = [e for e in entities if "@" in e.text]
        assert len(emails) == 2

    def test_extract_mention(self, extractor):
        text = "Thanks @johndoe for the review"
        entities = extractor._extract_with_regex(text)

        mention_entities = [e for e in entities if e.text == "johndoe"]
        assert len(mention_entities) == 1
        assert mention_entities[0].label == "person"
        assert mention_entities[0].score == 0.9
        assert mention_entities[0].source == "regex"

    def test_extract_slack_user(self, extractor):
        text = "Hey <@U12345678> can you review this?"
        entities = extractor._extract_with_regex(text)

        slack_entities = [e for e in entities if e.score == 1.0 and e.text == "U12345678"]
        assert len(slack_entities) == 1
        assert slack_entities[0].label == "person"
        assert slack_entities[0].source == "regex"

    def test_extract_multiple_patterns(self, extractor):
        text = "Contact @admin or admin@company.com, or ping <@U99999999>"
        entities = extractor._extract_with_regex(text)

        assert len(entities) >= 3

    def test_no_matches(self, extractor):
        text = "This text has no entities to extract"
        entities = extractor._extract_with_regex(text)
        assert len(entities) == 0


class TestDeduplication:
    @pytest.fixture
    def extractor(self):
        EntityExtractor._instance = None
        with patch("torch.cuda.is_available", return_value=False):
            with patch("torch.backends.mps.is_available", return_value=False):
                return EntityExtractor()

    def test_empty_list_returns_empty(self, extractor):
        result = extractor._deduplicate([])
        assert result == []

    def test_no_overlaps_keeps_all(self, extractor):
        entities = [
            ExtractedEntity("John", "person", 0.9, 0, 4, "gliner"),
            ExtractedEntity("NYC", "location", 0.8, 10, 13, "gliner"),
        ]
        result = extractor._deduplicate(entities)
        assert len(result) == 2

    def test_overlapping_keeps_higher_score(self, extractor):
        entities = [
            ExtractedEntity("John Smith", "person", 0.8, 0, 10, "regex"),
            ExtractedEntity("John Smith", "person", 0.95, 0, 10, "gliner"),
        ]
        result = extractor._deduplicate(entities)
        assert len(result) == 1
        assert result[0].score == 0.95

    def test_partial_overlap_keeps_higher_score(self, extractor):
        entities = [
            ExtractedEntity("John", "person", 0.9, 0, 4, "gliner"),
            ExtractedEntity("John Smith", "person", 0.7, 0, 10, "gliner"),
        ]
        result = extractor._deduplicate(entities)
        assert len(result) == 1
        assert result[0].text == "John"

    def test_adjacent_entities_kept(self, extractor):
        entities = [
            ExtractedEntity("John", "person", 0.9, 0, 4, "gliner"),
            ExtractedEntity("Smith", "person", 0.85, 5, 10, "gliner"),
        ]
        result = extractor._deduplicate(entities)
        assert len(result) == 2


class TestOverlaps:
    @pytest.mark.parametrize(
        "a_start,a_end,b_start,b_end,expected_overlap",
        [
            (0, 5, 10, 15, False),
            (10, 15, 0, 5, False),
            (0, 10, 0, 10, True),
            (0, 10, 5, 15, True),
            (0, 5, 5, 10, False),
            (5, 10, 0, 5, False),
            (0, 10, 3, 7, True),
            (3, 7, 0, 10, True),
        ],
        ids=[
            "a-before-b",
            "b-before-a",
            "full-overlap",
            "partial-overlap-right",
            "adjacent-a-then-b",
            "adjacent-b-then-a",
            "b-inside-a",
            "a-inside-b",
        ],
    )
    def test_overlap_detection(
        self, a_start, a_end, b_start, b_end, expected_overlap
    ):
        a = ExtractedEntity("a", "person", 0.9, a_start, a_end, "gliner")
        b = ExtractedEntity("b", "person", 0.8, b_start, b_end, "gliner")
        assert EntityExtractor._overlaps(a, b) is expected_overlap


class TestExtract:
    @pytest.fixture
    def extractor(self):
        EntityExtractor._instance = None
        with patch("torch.cuda.is_available", return_value=False):
            with patch("torch.backends.mps.is_available", return_value=False):
                return EntityExtractor()

    @pytest.mark.parametrize(
        "text",
        [
            "",
            "   \n\t  ",
            None,
            "     ",
            "\n\n\n",
        ],
        ids=["empty", "whitespace-mixed", "none", "spaces-only", "newlines-only"],
    )
    def test_empty_or_whitespace_returns_empty(self, extractor, text):
        result = extractor.extract(text)
        assert result == []

    @patch.object(EntityExtractor, "_extract_with_gliner")
    @patch.object(EntityExtractor, "_extract_with_regex")
    def test_extract_combines_sources(self, mock_regex, mock_gliner, extractor):
        mock_gliner.return_value = [
            ExtractedEntity("Acme Corp", "organization", 0.9, 0, 9, "gliner")
        ]
        mock_regex.return_value = [
            ExtractedEntity("john@acme.com", "person", 1.0, 20, 33, "regex")
        ]

        result = extractor.extract("Acme Corp welcomes john@acme.com")

        assert len(result) == 2
        mock_gliner.assert_called_once()
        mock_regex.assert_called_once()

    @patch.object(EntityExtractor, "_extract_with_gliner")
    @patch.object(EntityExtractor, "_extract_with_regex")
    def test_extract_truncates_long_text_for_gliner(
        self, mock_regex, mock_gliner, extractor
    ):
        mock_gliner.return_value = []
        mock_regex.return_value = []

        long_text = "a" * 10000
        extractor.extract(long_text, max_length=4096)

        call_args = mock_gliner.call_args
        assert len(call_args[0][0]) == 4096

    @patch.object(EntityExtractor, "_extract_with_gliner")
    @patch.object(EntityExtractor, "_extract_with_regex")
    def test_extract_full_text_for_regex(self, mock_regex, mock_gliner, extractor):
        mock_gliner.return_value = []
        mock_regex.return_value = []

        long_text = "a" * 10000
        extractor.extract(long_text, max_length=4096)

        call_args = mock_regex.call_args
        assert len(call_args[0][0]) == 10000


class TestGlinerExtraction:
    @pytest.fixture
    def extractor(self):
        EntityExtractor._instance = None
        with patch("torch.cuda.is_available", return_value=False):
            with patch("torch.backends.mps.is_available", return_value=False):
                ext = EntityExtractor()
                ext._model = None
                return ext

    @pytest.fixture
    def mock_gliner_module(self):
        mock_gliner = MagicMock()
        mock_model = MagicMock()
        mock_gliner.GLiNER = MagicMock()
        mock_gliner.GLiNER.from_pretrained.return_value = mock_model
        mock_model.to.return_value = mock_model
        return mock_gliner, mock_model

    def test_ensure_model_loads_once(self, extractor, mock_gliner_module):
        mock_gliner, mock_model = mock_gliner_module

        import sys

        sys.modules["gliner"] = mock_gliner

        try:
            extractor._ensure_model()
            extractor._ensure_model()

            mock_gliner.GLiNER.from_pretrained.assert_called_once_with(
                EntityExtractor.MODEL_NAME
            )
        finally:
            del sys.modules["gliner"]

    def test_ensure_model_raises_on_failure(self, extractor):
        mock_gliner = MagicMock()
        mock_gliner.GLiNER.from_pretrained.side_effect = RuntimeError("Download failed")

        import sys

        sys.modules["gliner"] = mock_gliner

        try:
            with pytest.raises(ModelLoadError) as exc_info:
                extractor._ensure_model()

            assert "Failed to load" in str(exc_info.value)
        finally:
            del sys.modules["gliner"]

    def test_extract_with_gliner_returns_entities(self, extractor, mock_gliner_module):
        mock_gliner, mock_model = mock_gliner_module
        mock_model.predict_entities.return_value = [
            {"text": "John", "label": "person", "score": 0.95, "start": 0, "end": 4},
            {"text": "NYC", "label": "location", "score": 0.88, "start": 10, "end": 13},
        ]

        import sys

        sys.modules["gliner"] = mock_gliner

        try:
            result = extractor._extract_with_gliner("John works in NYC", threshold=0.5)

            assert len(result) == 2
            assert result[0].text == "John"
            assert result[0].label == "person"
            assert result[0].score == 0.95
            assert result[0].source == "gliner"
            assert result[1].text == "NYC"
            assert result[1].label == "location"
        finally:
            del sys.modules["gliner"]

    def test_extract_with_gliner_uses_threshold(self, extractor, mock_gliner_module):
        mock_gliner, mock_model = mock_gliner_module
        mock_model.predict_entities.return_value = []

        import sys

        sys.modules["gliner"] = mock_gliner

        try:
            extractor._extract_with_gliner("Some text", threshold=0.7)

            mock_model.predict_entities.assert_called_with(
                "Some text",
                EntityExtractor.GLINER_LABELS,
                threshold=0.7,
            )
        finally:
            del sys.modules["gliner"]


class TestClassAttributes:
    def test_model_name(self):
        assert EntityExtractor.MODEL_NAME == "urchade/gliner_medium-v2.1"

    def test_gliner_labels(self):
        expected_labels = [
            "person",
            "team",
            "project",
            "technology",
            "location",
            "organization",
        ]
        assert expected_labels == EntityExtractor.GLINER_LABELS

    def test_email_pattern_matches_valid_emails(self):
        pattern = EntityExtractor.EMAIL_PATTERN
        assert pattern.search("test@example.com")
        assert pattern.search("user.name@sub.domain.org")
        assert not pattern.search("invalid-email")

    def test_mention_pattern_matches_at_mentions(self):
        pattern = EntityExtractor.MENTION_PATTERN
        assert pattern.search("@username")
        assert pattern.search("@user_name")
        assert pattern.search("Thanks @admin for help")

    def test_slack_user_pattern_matches_slack_ids(self):
        pattern = EntityExtractor.SLACK_USER_PATTERN
        assert pattern.search("<@U12345678>")
        assert pattern.search("<@UABCDEFGH>")
        assert not pattern.search("@username")
