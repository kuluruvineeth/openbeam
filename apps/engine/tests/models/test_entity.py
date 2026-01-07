from __future__ import annotations

import pytest
from pydantic import ValidationError

from engine.models.entity import (
    DocumentExtractRequest,
    DocumentExtractResponse,
    Entity,
    EntityResponse,
    ExtractedEntityResponse,
    ExtractRequest,
    ExtractResponse,
)


class TestEntity:
    def test_valid_entity(self):
        entity = Entity(
            text="John",
            label="person",
            score=0.95,
            start=0,
            end=4,
            source="gliner",
        )
        assert entity.text == "John"
        assert entity.label == "person"
        assert entity.score == 0.95
        assert entity.start == 0
        assert entity.end == 4
        assert entity.source == "gliner"


class TestExtractRequest:
    def test_valid_request(self):
        request = ExtractRequest(text="John works at OpenAI")
        assert request.text == "John works at OpenAI"
        assert request.labels is None
        assert request.threshold == 0.5

    def test_with_labels(self):
        request = ExtractRequest(
            text="test",
            labels=["person", "organization"],
            threshold=0.7,
        )
        assert request.labels == ["person", "organization"]
        assert request.threshold == 0.7

    def test_empty_text_invalid(self):
        with pytest.raises(ValidationError):
            ExtractRequest(text="")

    def test_threshold_bounds(self):
        with pytest.raises(ValidationError):
            ExtractRequest(text="test", threshold=-0.1)

        with pytest.raises(ValidationError):
            ExtractRequest(text="test", threshold=1.1)


class TestEntityResponse:
    def test_valid_response(self):
        response = EntityResponse(
            entities=[
                Entity(
                    text="John",
                    label="person",
                    score=0.9,
                    start=0,
                    end=4,
                    source="gliner",
                )
            ],
            model="test-model",
            usage={"latency_ms": 50.0},
        )
        assert len(response.entities) == 1
        assert response.model == "test-model"

    def test_empty_entities(self):
        response = EntityResponse(
            entities=[],
            model="test",
            usage={"latency_ms": 10.0},
        )
        assert response.entities == []


class TestExtractedEntityResponse:
    def test_valid_response(self):
        response = ExtractedEntityResponse(
            text="OpenAI",
            label="organization",
            score=0.88,
            start=14,
            end=20,
            source="gliner",
        )
        assert response.text == "OpenAI"
        assert response.label == "organization"


class TestExtractResponse:
    def test_valid_response(self):
        response = ExtractResponse(
            entities=[
                ExtractedEntityResponse(
                    text="John",
                    label="person",
                    score=0.9,
                    start=0,
                    end=4,
                    source="gliner",
                )
            ],
            count=1,
            elapsed_ms=25.5,
        )
        assert response.count == 1
        assert response.elapsed_ms == 25.5


class TestDocumentExtractRequest:
    def test_valid_request(self):
        request = DocumentExtractRequest(
            doc_id="doc123",
            content="Test content",
        )
        assert request.doc_id == "doc123"
        assert request.title == ""
        assert request.author is None
        assert request.connector_metadata is None

    def test_with_metadata(self):
        request = DocumentExtractRequest(
            doc_id="doc456",
            title="Test Document",
            content="Content here",
            author="Test Author",
            connector_metadata={"source": "slack", "channel_id": "C123"},
        )
        assert request.title == "Test Document"
        assert request.author == "Test Author"
        assert request.connector_metadata["source"] == "slack"


class TestDocumentExtractResponse:
    def test_valid_response(self):
        response = DocumentExtractResponse(
            doc_id="doc123",
            entities=[
                ExtractedEntityResponse(
                    text="Entity",
                    label="test",
                    score=0.9,
                    start=0,
                    end=6,
                    source="gliner",
                )
            ],
            entity_count=1,
        )
        assert response.doc_id == "doc123"
        assert response.entity_count == 1
