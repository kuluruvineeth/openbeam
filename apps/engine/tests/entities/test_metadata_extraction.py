from __future__ import annotations

from engine.api.routes.entities import (
    _ARRAY_EXTRACTORS,
    _METADATA_EXTRACTORS,
    _NESTED_ARRAY_EXTRACTORS,
    _extract_from_metadata,
)


class TestUniversalExtractors:
    def test_channel_name(self) -> None:
        result = _extract_from_metadata({"channel_name": "engineering"})
        assert any(e.text == "engineering" and e.label == "channel" for e in result)

    def test_repository(self) -> None:
        result = _extract_from_metadata({"repository": "openbeam/core"})
        assert any(e.text == "openbeam/core" and e.label == "repository" for e in result)

    def test_project_name(self) -> None:
        result = _extract_from_metadata({"project_name": "Search V2"})
        assert any(e.text == "Search V2" and e.label == "project" for e in result)

    def test_team_name(self) -> None:
        result = _extract_from_metadata({"team_name": "Platform"})
        assert any(e.text == "Platform" and e.label == "team" for e in result)

    def test_empty_metadata(self) -> None:
        assert _extract_from_metadata({}) == []

    def test_non_string_values_skipped(self) -> None:
        result = _extract_from_metadata({"channel_name": 42, "team_name": True})
        assert result == []

    def test_whitespace_only_values_skipped(self) -> None:
        result = _extract_from_metadata({"channel_name": "   "})
        assert result == []


class TestGitHubExtractors:
    def test_repo_full_name(self) -> None:
        result = _extract_from_metadata(
            {"repoFullName": "openbeam/engine"}, "github"
        )
        assert any(
            e.text == "openbeam/engine" and e.label == "repository" for e in result
        )

    def test_milestone_title(self) -> None:
        result = _extract_from_metadata(
            {"milestoneTitle": "v2.0 Release"}, "github"
        )
        assert any(e.text == "v2.0 Release" and e.label == "event" for e in result)

    def test_branch_refs(self) -> None:
        result = _extract_from_metadata(
            {"headRef": "feat/search", "baseRef": "main"}, "github"
        )
        assert any(e.text == "feat/search" and e.label == "topic" for e in result)
        assert any(e.text == "main" and e.label == "topic" for e in result)

    def test_array_assignees(self) -> None:
        result = _extract_from_metadata(
            {"assignees": ["alice", "bob"]}, "github"
        )
        persons = [e for e in result if e.label == "person"]
        assert len(persons) == 2

    def test_array_reviewers(self) -> None:
        result = _extract_from_metadata(
            {"requestedReviewers": ["carol"]}, "github"
        )
        assert any(e.text == "carol" and e.label == "person" for e in result)

    def test_nested_labels(self) -> None:
        result = _extract_from_metadata(
            {"labels": [{"name": "bug"}, {"name": "priority:high"}]}, "github"
        )
        topics = [e for e in result if e.label == "topic"]
        assert len(topics) == 2
        assert {t.text for t in topics} == {"bug", "priority:high"}


class TestLinearExtractors:
    def test_team_and_project(self) -> None:
        result = _extract_from_metadata(
            {"teamName": "Engineering", "projectName": "Search V2"}, "linear"
        )
        assert any(e.text == "Engineering" and e.label == "team" for e in result)
        assert any(e.text == "Search V2" and e.label == "project" for e in result)

    def test_identifier_as_ticket(self) -> None:
        result = _extract_from_metadata(
            {"identifier": "ENG-1234"}, "linear"
        )
        assert any(e.text == "ENG-1234" and e.label == "ticket" for e in result)

    def test_cycle_name_as_event(self) -> None:
        result = _extract_from_metadata(
            {"cycleName": "Sprint 42"}, "linear"
        )
        assert any(e.text == "Sprint 42" and e.label == "event" for e in result)

    def test_nested_labels_and_teams(self) -> None:
        result = _extract_from_metadata(
            {
                "labels": [{"name": "P0"}],
                "teams": [{"name": "Backend"}],
            },
            "linear",
        )
        assert any(e.text == "P0" and e.label == "topic" for e in result)
        assert any(e.text == "Backend" and e.label == "team" for e in result)


class TestSlackExtractors:
    def test_channel_name(self) -> None:
        result = _extract_from_metadata(
            {"channelName": "general"}, "slack"
        )
        assert any(e.text == "general" and e.label == "channel" for e in result)


class TestNotionExtractors:
    def test_database_name(self) -> None:
        result = _extract_from_metadata(
            {"databaseName": "Task Board"}, "notion"
        )
        assert any(e.text == "Task Board" and e.label == "project" for e in result)


class TestGoogleDriveExtractors:
    def test_last_modifier(self) -> None:
        result = _extract_from_metadata(
            {"lastModifierName": "Jane Doe", "lastModifierEmail": "jane@acme.com"},
            "google_drive",
        )
        persons = [e for e in result if e.label == "person"]
        assert len(persons) == 2


class TestGmailArrayExtractors:
    def test_participants(self) -> None:
        result = _extract_from_metadata(
            {"participants": ["alice@acme.com", "bob@acme.com"]}, "gmail"
        )
        persons = [e for e in result if e.label == "person"]
        assert len(persons) == 2


class TestDeduplication:
    def test_duplicate_values_deduplicated(self) -> None:
        result = _extract_from_metadata(
            {"channel_name": "general", "channelName": "general"}, "slack"
        )
        channels = [e for e in result if e.label == "channel"]
        assert len(channels) == 1

    def test_case_insensitive_dedup(self) -> None:
        result = _extract_from_metadata(
            {"channel_name": "Engineering", "channelName": "engineering"}, "slack"
        )
        channels = [e for e in result if e.label == "channel"]
        assert len(channels) == 1


class TestUnknownConnector:
    def test_unknown_connector_uses_universal_only(self) -> None:
        result = _extract_from_metadata(
            {"channel_name": "general", "teamName": "Engineering"},
            "unknown_connector",
        )
        assert any(e.text == "general" for e in result)
        assert not any(e.text == "Engineering" for e in result)

    def test_no_connector_type_uses_universal_only(self) -> None:
        result = _extract_from_metadata(
            {"channel_name": "general", "teamName": "Engineering"},
            None,
        )
        assert any(e.text == "general" for e in result)
        assert not any(e.text == "Engineering" for e in result)


class TestAllSourcesAreMetadata:
    def test_all_entities_have_metadata_source(self) -> None:
        result = _extract_from_metadata(
            {
                "channel_name": "eng",
                "repoFullName": "org/repo",
                "assignees": ["alice"],
                "labels": [{"name": "bug"}],
            },
            "github",
        )
        assert all(e.source == "metadata" for e in result)


class TestExtractorTableCompleteness:
    def test_universal_exists(self) -> None:
        assert "__universal__" in _METADATA_EXTRACTORS
        assert len(_METADATA_EXTRACTORS["__universal__"]) >= 4

    def test_github_extractors_exist(self) -> None:
        assert "github" in _METADATA_EXTRACTORS
        assert "github" in _ARRAY_EXTRACTORS
        assert "github" in _NESTED_ARRAY_EXTRACTORS

    def test_linear_extractors_exist(self) -> None:
        assert "linear" in _METADATA_EXTRACTORS
        assert "linear" in _NESTED_ARRAY_EXTRACTORS
