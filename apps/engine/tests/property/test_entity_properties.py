from __future__ import annotations

import pytest
from hypothesis import HealthCheck, assume, given, settings, strategies as st

from engine.entities.extractor import EntityExtractor, ExtractedEntity


def entity_strategy(
    min_start: int = 0,
    max_end: int = 1000,
) -> st.SearchStrategy[ExtractedEntity]:
    return st.builds(
        ExtractedEntity,
        text=st.text(min_size=1, max_size=50),
        label=st.sampled_from(["person", "organization", "location", "technology"]),
        score=st.floats(min_value=0.0, max_value=1.0, allow_nan=False),
        start=st.integers(min_value=min_start, max_value=max_end - 1),
        end=st.integers(min_value=min_start + 1, max_value=max_end),
        source=st.sampled_from(["gliner", "regex"]),
    ).filter(lambda e: e.start < e.end)


@pytest.mark.property
class TestOverlapsProperties:
    @given(
        start=st.integers(min_value=0, max_value=900),
        length=st.integers(min_value=1, max_value=100),
    )
    @settings(max_examples=100)
    def test_reflexive_entity_overlaps_itself(self, start: int, length: int):
        entity = ExtractedEntity(
            text="test",
            label="person",
            score=0.9,
            start=start,
            end=start + length,
            source="gliner",
        )
        assert EntityExtractor._overlaps(entity, entity) is True

    @given(
        start_a=st.integers(min_value=0, max_value=400),
        len_a=st.integers(min_value=1, max_value=100),
        start_b=st.integers(min_value=0, max_value=400),
        len_b=st.integers(min_value=1, max_value=100),
    )
    @settings(max_examples=200)
    def test_symmetric_overlap_detection(
        self, start_a: int, len_a: int, start_b: int, len_b: int
    ):
        a = ExtractedEntity(
            text="a", label="person", score=0.9, start=start_a, end=start_a + len_a, source="gliner"
        )
        b = ExtractedEntity(
            text="b", label="person", score=0.8, start=start_b, end=start_b + len_b, source="gliner"
        )

        overlap_a_b = EntityExtractor._overlaps(a, b)
        overlap_b_a = EntityExtractor._overlaps(b, a)

        assert overlap_a_b == overlap_b_a

    @given(
        start=st.integers(min_value=0, max_value=800),
        len_a=st.integers(min_value=1, max_value=100),
        len_b=st.integers(min_value=1, max_value=100),
    )
    @settings(max_examples=100)
    def test_touching_intervals_do_not_overlap(
        self, start: int, len_a: int, len_b: int
    ):
        a = ExtractedEntity(
            text="a", label="person", score=0.9, start=start, end=start + len_a, source="gliner"
        )
        b = ExtractedEntity(
            text="b",
            label="person",
            score=0.8,
            start=start + len_a,
            end=start + len_a + len_b,
            source="gliner",
        )

        assert EntityExtractor._overlaps(a, b) is False

    @given(
        outer_start=st.integers(min_value=0, max_value=400),
        outer_len=st.integers(min_value=10, max_value=200),
        inner_offset=st.integers(min_value=1, max_value=50),
        inner_len=st.integers(min_value=1, max_value=50),
    )
    @settings(max_examples=100)
    def test_contained_entities_overlap(
        self, outer_start: int, outer_len: int, inner_offset: int, inner_len: int
    ):
        assume(inner_offset + inner_len < outer_len)

        outer = ExtractedEntity(
            text="outer",
            label="person",
            score=0.9,
            start=outer_start,
            end=outer_start + outer_len,
            source="gliner",
        )
        inner = ExtractedEntity(
            text="inner",
            label="person",
            score=0.8,
            start=outer_start + inner_offset,
            end=outer_start + inner_offset + inner_len,
            source="gliner",
        )

        assert EntityExtractor._overlaps(outer, inner) is True

    @given(
        start_a=st.integers(min_value=0, max_value=300),
        len_a=st.integers(min_value=1, max_value=100),
        gap=st.integers(min_value=1, max_value=100),
        len_b=st.integers(min_value=1, max_value=100),
    )
    @settings(max_examples=100)
    def test_disjoint_intervals_do_not_overlap(
        self, start_a: int, len_a: int, gap: int, len_b: int
    ):
        a = ExtractedEntity(
            text="a", label="person", score=0.9, start=start_a, end=start_a + len_a, source="gliner"
        )
        b = ExtractedEntity(
            text="b",
            label="person",
            score=0.8,
            start=start_a + len_a + gap,
            end=start_a + len_a + gap + len_b,
            source="gliner",
        )

        assert EntityExtractor._overlaps(a, b) is False


@pytest.mark.property
class TestDeduplicateProperties:
    @pytest.fixture
    def extractor(self):
        extractor = EntityExtractor()
        return extractor

    @given(entities=st.lists(entity_strategy(), min_size=0, max_size=20))
    @settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_result_size_lte_input(self, extractor, entities: list[ExtractedEntity]):
        result = extractor._deduplicate(entities)
        assert len(result) <= len(entities)

    @given(entities=st.lists(entity_strategy(), min_size=0, max_size=20))
    @settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_no_overlapping_entities_in_result(
        self, extractor, entities: list[ExtractedEntity]
    ):
        result = extractor._deduplicate(entities)

        for i, a in enumerate(result):
            for j, b in enumerate(result):
                if i < j:
                    assert not EntityExtractor._overlaps(a, b), (
                        f"Entities {i} and {j} overlap in result"
                    )

    @given(entities=st.lists(entity_strategy(), min_size=1, max_size=20))
    @settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_highest_score_preserved_when_no_overlap(
        self, extractor, entities: list[ExtractedEntity]
    ):
        result = extractor._deduplicate(entities)

        if entities:
            max_score = max(e.score for e in entities)
            result_scores = [e.score for e in result]
            assert max_score in result_scores or any(
                e.score == max_score for e in entities
                if any(
                    EntityExtractor._overlaps(e, r) and r.score > e.score
                    for r in entities
                    if r is not e
                )
            )

    def test_empty_input_returns_empty_output(self, extractor):
        result = extractor._deduplicate([])
        assert result == []

    @given(
        text=st.text(min_size=1, max_size=50),
        label=st.sampled_from(["person", "organization"]),
        score=st.floats(min_value=0.0, max_value=1.0, allow_nan=False),
        start=st.integers(min_value=0, max_value=100),
        length=st.integers(min_value=1, max_value=50),
    )
    @settings(max_examples=50, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_single_entity_preserved(
        self, extractor, text: str, label: str, score: float, start: int, length: int
    ):
        entity = ExtractedEntity(
            text=text,
            label=label,
            score=score,
            start=start,
            end=start + length,
            source="gliner",
        )

        result = extractor._deduplicate([entity])

        assert len(result) == 1
        assert result[0] == entity

    @given(
        start=st.integers(min_value=0, max_value=100),
        len_a=st.integers(min_value=1, max_value=50),
        gap=st.integers(min_value=1, max_value=50),
        len_b=st.integers(min_value=1, max_value=50),
    )
    @settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_non_overlapping_entities_all_preserved(
        self, extractor, start: int, len_a: int, gap: int, len_b: int
    ):
        a = ExtractedEntity(
            text="first",
            label="person",
            score=0.8,
            start=start,
            end=start + len_a,
            source="gliner",
        )
        b = ExtractedEntity(
            text="second",
            label="organization",
            score=0.7,
            start=start + len_a + gap,
            end=start + len_a + gap + len_b,
            source="gliner",
        )

        result = extractor._deduplicate([a, b])

        assert len(result) == 2

    @given(
        start=st.integers(min_value=0, max_value=100),
        length=st.integers(min_value=1, max_value=50),
        score_high=st.floats(min_value=0.6, max_value=1.0, allow_nan=False),
        score_low=st.floats(min_value=0.0, max_value=0.5, allow_nan=False),
    )
    @settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_higher_score_wins_on_overlap(
        self, extractor, start: int, length: int, score_high: float, score_low: float
    ):
        high = ExtractedEntity(
            text="high",
            label="person",
            score=score_high,
            start=start,
            end=start + length,
            source="gliner",
        )
        low = ExtractedEntity(
            text="low",
            label="organization",
            score=score_low,
            start=start,
            end=start + length,
            source="regex",
        )

        result = extractor._deduplicate([high, low])

        assert len(result) == 1
        assert result[0].score == score_high

        result_reversed = extractor._deduplicate([low, high])

        assert len(result_reversed) == 1
        assert result_reversed[0].score == score_high


@pytest.mark.property
class TestEntityStructurePreservation:
    @pytest.fixture
    def extractor(self):
        return EntityExtractor()

    @given(entity=entity_strategy())
    @settings(max_examples=50, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_entity_fields_preserved_through_dedup(
        self, extractor, entity: ExtractedEntity
    ):
        result = extractor._deduplicate([entity])

        assert len(result) == 1
        preserved = result[0]
        assert preserved.text == entity.text
        assert preserved.label == entity.label
        assert preserved.score == entity.score
        assert preserved.start == entity.start
        assert preserved.end == entity.end
        assert preserved.source == entity.source

    @given(entities=st.lists(entity_strategy(), min_size=1, max_size=20))
    @settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_result_is_subset_of_input(
        self, extractor, entities: list[ExtractedEntity]
    ):
        result = extractor._deduplicate(entities)

        for r in result:
            assert any(
                r.text == e.text
                and r.label == e.label
                and r.score == e.score
                and r.start == e.start
                and r.end == e.end
                and r.source == e.source
                for e in entities
            )


@pytest.mark.property
class TestDeduplicateIdempotence:
    @pytest.fixture
    def extractor(self):
        return EntityExtractor()

    @given(entities=st.lists(entity_strategy(), min_size=0, max_size=20))
    @settings(max_examples=50, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_deduplicate_is_idempotent(
        self, extractor, entities: list[ExtractedEntity]
    ):
        first_pass = extractor._deduplicate(entities)
        second_pass = extractor._deduplicate(first_pass)

        assert len(first_pass) == len(second_pass)

        for a, b in zip(first_pass, second_pass, strict=True):
            assert a.text == b.text
            assert a.start == b.start
            assert a.end == b.end
