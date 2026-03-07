from __future__ import annotations

import pytest

from engine.entities.extractor import ExtractedEntity
from engine.entities.validator import EntityValidator, ValidationConfig


@pytest.fixture
def validator() -> EntityValidator:
    return EntityValidator()


def _entity(
    text: str = "Acme Corp",
    label: str = "organization",
    score: float = 0.9,
    source: str = "gliner",
) -> ExtractedEntity:
    return ExtractedEntity(
        text=text, label=label, score=score, start=0, end=len(text), source=source
    )


class TestValidEntities:
    def test_normal_person(self, validator: EntityValidator) -> None:
        assert validator.validate(_entity("John Smith", "person", 0.9))

    def test_normal_organization(self, validator: EntityValidator) -> None:
        assert validator.validate(_entity("Acme Corporation", "organization"))

    def test_normal_technology(self, validator: EntityValidator) -> None:
        assert validator.validate(_entity("Python", "technology"))

    def test_normal_location(self, validator: EntityValidator) -> None:
        assert validator.validate(_entity("New York", "location"))

    def test_normal_project(self, validator: EntityValidator) -> None:
        assert validator.validate(_entity("OpenBeam", "project"))


class TestLengthBounds:
    def test_too_short(self, validator: EntityValidator) -> None:
        assert not validator.validate(_entity("X"))

    def test_empty_text(self, validator: EntityValidator) -> None:
        assert not validator.validate(_entity(""))

    def test_whitespace_only(self, validator: EntityValidator) -> None:
        assert not validator.validate(_entity("   "))

    def test_too_long(self, validator: EntityValidator) -> None:
        assert not validator.validate(_entity("A" * 101))

    def test_exactly_min_length(self, validator: EntityValidator) -> None:
        assert validator.validate(_entity("AB"))

    def test_at_max_length(self, validator: EntityValidator) -> None:
        assert validator.validate(_entity("Acme Corp Global"))


class TestBlocklist:
    @pytest.mark.parametrize(
        "word",
        ["the", "true", "false", "null", "function", "return", "import", "class", "void"],
    )
    def test_blocklisted_words(self, validator: EntityValidator, word: str) -> None:
        assert not validator.validate(_entity(word))

    def test_blocklist_case_insensitive(self, validator: EntityValidator) -> None:
        assert not validator.validate(_entity("NULL"))
        assert not validator.validate(_entity("True"))
        assert not validator.validate(_entity("FUNCTION"))

    @pytest.mark.parametrize(
        "word",
        ["http", "https", "get", "post", "put", "delete", "patch"],
    )
    def test_http_methods_blocked(self, validator: EntityValidator, word: str) -> None:
        assert not validator.validate(_entity(word))


class TestRejectionPatterns:
    def test_connection_string(self, validator: EntityValidator) -> None:
        assert not validator.validate(_entity("mongodb://user:pass@host:27017"))

    def test_url(self, validator: EntityValidator) -> None:
        assert not validator.validate(_entity("https://example.com"))

    def test_email(self, validator: EntityValidator) -> None:
        assert not validator.validate(_entity("john@example.com"))

    def test_file_path(self, validator: EntityValidator) -> None:
        assert not validator.validate(_entity("/var/log/app.log"))

    def test_windows_path(self, validator: EntityValidator) -> None:
        assert not validator.validate(_entity(r"C:\Users\admin"))

    def test_json_snippet(self, validator: EntityValidator) -> None:
        assert not validator.validate(_entity('{"key": "value"}'))

    def test_sha256_hash(self, validator: EntityValidator) -> None:
        assert not validator.validate(_entity("sha256:" + "a" * 64))

    def test_git_sha(self, validator: EntityValidator) -> None:
        assert not validator.validate(_entity("a" * 40))

    def test_semver(self, validator: EntityValidator) -> None:
        assert not validator.validate(_entity("v2.3.1"))
        assert not validator.validate(_entity("1.0.0"))

    def test_ip_address(self, validator: EntityValidator) -> None:
        assert not validator.validate(_entity("192.168.1.1"))

    def test_pure_number(self, validator: EntityValidator) -> None:
        assert not validator.validate(_entity("12345"))

    def test_screaming_snake_case(self, validator: EntityValidator) -> None:
        assert not validator.validate(_entity("MAX_RETRIES"))
        assert not validator.validate(_entity("API_KEY"))


class TestTokenCount:
    def test_too_many_tokens(self, validator: EntityValidator) -> None:
        long_name = "The Very Long Name Of Some Entity That Has Many Words Exceeding Limit"
        assert not validator.validate(_entity(long_name))

    def test_acceptable_token_count(self, validator: EntityValidator) -> None:
        assert validator.validate(_entity("New York City"))


class TestSpecialCharRatio:
    def test_high_special_char_ratio(self, validator: EntityValidator) -> None:
        assert not validator.validate(_entity("{[(<>)]}"))

    def test_acceptable_special_chars(self, validator: EntityValidator) -> None:
        assert validator.validate(_entity("C++ Language"))


class TestDigitRatio:
    def test_person_with_too_many_digits(self, validator: EntityValidator) -> None:
        assert not validator.validate(_entity("1234567890", "person"))

    def test_person_with_few_digits_ok(self, validator: EntityValidator) -> None:
        assert validator.validate(_entity("Agent 47", "person"))


class TestPersonConfidence:
    def test_low_confidence_person_rejected(self, validator: EntityValidator) -> None:
        assert not validator.validate(_entity("John", "person", 0.50, "gliner"))

    def test_sufficient_confidence_person(self, validator: EntityValidator) -> None:
        assert validator.validate(_entity("John", "person", 0.55, "gliner"))

    def test_confidence_threshold_only_for_gliner(self, validator: EntityValidator) -> None:
        assert validator.validate(_entity("John", "person", 0.3, "regex"))


class TestCustomConfig:
    def test_custom_min_length(self) -> None:
        v = EntityValidator(ValidationConfig(min_length=5))
        assert not v.validate(_entity("Abc"))
        assert v.validate(_entity("Abcde"))

    def test_custom_max_length(self) -> None:
        v = EntityValidator(ValidationConfig(max_length=10))
        assert not v.validate(_entity("Acme Twelve"))
        assert v.validate(_entity("Acme Seven"))


class TestFilterBatch:
    def test_filters_invalid_entities(self, validator: EntityValidator) -> None:
        entities = [
            _entity("John Smith", "person", 0.9),
            _entity("the", "person", 0.5),
            _entity("https://example.com", "technology", 0.8),
            _entity("Acme Corp", "organization", 0.85),
        ]
        result = validator.filter_batch(entities)
        assert len(result) == 2
        assert result[0].text == "John Smith"
        assert result[1].text == "Acme Corp"

    def test_empty_batch(self, validator: EntityValidator) -> None:
        assert validator.filter_batch([]) == []
