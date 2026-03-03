from __future__ import annotations

from engine.entities.extractor import EntityExtractor


class TestGitHubRegex:
    def test_issue_reference(self) -> None:
        result = EntityExtractor._extract_with_connector_regex(
            "Fix #123 and close #456", "github"
        )
        tickets = [e for e in result if e.label == "ticket"]
        assert len(tickets) == 2
        assert {t.text for t in tickets} == {"123", "456"}

    def test_ignores_hash_in_hex(self) -> None:
        result = EntityExtractor._extract_with_connector_regex(
            "Color is #FF0000", "github"
        )
        assert len(result) == 0

    def test_no_match_without_leading_hash(self) -> None:
        result = EntityExtractor._extract_with_connector_regex(
            "Issue 123 is open", "github"
        )
        assert len(result) == 0


class TestLinearRegex:
    def test_linear_identifier(self) -> None:
        result = EntityExtractor._extract_with_connector_regex(
            "Working on ENG-1234 today", "linear"
        )
        assert len(result) == 1
        assert result[0].text == "ENG-1234"
        assert result[0].label == "ticket"
        assert result[0].score == 0.95

    def test_multiple_identifiers(self) -> None:
        result = EntityExtractor._extract_with_connector_regex(
            "ENG-100 blocks PROD-200", "linear"
        )
        assert len(result) == 2
        assert {e.text for e in result} == {"ENG-100", "PROD-200"}

    def test_no_match_on_lowercase(self) -> None:
        result = EntityExtractor._extract_with_connector_regex(
            "eng-1234 is lowercase", "linear"
        )
        assert len(result) == 0


class TestJiraRegex:
    def test_jira_ticket(self) -> None:
        result = EntityExtractor._extract_with_connector_regex(
            "Assigned PROJ-789", "jira"
        )
        assert len(result) == 1
        assert result[0].text == "PROJ-789"
        assert result[0].label == "ticket"


class TestConfluenceRegex:
    def test_ticket_reference_in_confluence(self) -> None:
        result = EntityExtractor._extract_with_connector_regex(
            "See PROJ-123 for details", "confluence"
        )
        assert len(result) == 1
        assert result[0].text == "PROJ-123"
        assert result[0].score == 0.9


class TestSlackRegex:
    def test_slack_channel_reference(self) -> None:
        result = EntityExtractor._extract_with_connector_regex(
            "Check <#C01234|general> for updates", "slack"
        )
        assert len(result) == 1
        assert result[0].text == "general"
        assert result[0].label == "channel"
        assert result[0].score == 1.0

    def test_multiple_channels(self) -> None:
        result = EntityExtractor._extract_with_connector_regex(
            "<#C1|eng> and <#C2|design>", "slack"
        )
        assert len(result) == 2
        assert {e.text for e in result} == {"eng", "design"}


class TestZendeskRegex:
    def test_zendesk_ticket_hash(self) -> None:
        result = EntityExtractor._extract_with_connector_regex(
            "See #12345 for the customer request", "zendesk"
        )
        tickets = [e for e in result if e.label == "ticket"]
        assert len(tickets) == 1
        assert tickets[0].text == "12345"

    def test_zendesk_ticket_keyword(self) -> None:
        result = EntityExtractor._extract_with_connector_regex(
            "Ticket #67890 was escalated", "zendesk"
        )
        assert len(result) == 1
        assert result[0].text == "67890"

    def test_zendesk_ticket_no_hash(self) -> None:
        result = EntityExtractor._extract_with_connector_regex(
            "ticket 54321 needs follow-up", "zendesk"
        )
        assert len(result) == 1
        assert result[0].text == "54321"

    def test_short_numbers_ignored(self) -> None:
        result = EntityExtractor._extract_with_connector_regex(
            "#12 is too short for zendesk", "zendesk"
        )
        assert len(result) == 0


class TestNoConnectorType:
    def test_none_connector_returns_empty(self) -> None:
        result = EntityExtractor._extract_with_connector_regex(
            "ENG-123 #456", None
        )
        assert result == []

    def test_unknown_connector_returns_empty(self) -> None:
        result = EntityExtractor._extract_with_connector_regex(
            "ENG-123 #456", "unknown_connector"
        )
        assert result == []


class TestSourceField:
    def test_all_connector_regex_entities_have_regex_source(self) -> None:
        for connector in ["github", "linear", "jira", "slack", "zendesk"]:
            text = "ENG-123 #45678 <#C1|general> Ticket #12345"
            result = EntityExtractor._extract_with_connector_regex(
                text, connector
            )
            assert all(e.source == "regex" for e in result), (
                f"Non-regex source found for connector {connector}"
            )


class TestPositionTracking:
    def test_start_end_positions_are_accurate(self) -> None:
        text = "See ENG-123 for details"
        result = EntityExtractor._extract_with_connector_regex(text, "linear")
        assert len(result) == 1
        entity = result[0]
        assert text[entity.start : entity.end] == "ENG-123"
