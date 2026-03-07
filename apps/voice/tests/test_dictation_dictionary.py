from dictation.dictionary import CUSTOM_KEYWORDS


def test_keywords_are_tuples():
    for keyword, boost in CUSTOM_KEYWORDS:
        assert isinstance(keyword, str)
        assert isinstance(boost, float)
        assert boost > 0


def test_openbeam_has_highest_boost():
    boosts = {k: v for k, v in CUSTOM_KEYWORDS}
    assert boosts["OpenBeam"] == 3.0
