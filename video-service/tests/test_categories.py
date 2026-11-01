import pytest

from app.categories import normalize_category


@pytest.mark.parametrize("value", [None, "", " \t "])
def test_missing_category_defaults_to_other(value):
    assert normalize_category(value) == "other"


def test_category_is_trimmed_and_case_normalized():
    assert normalize_category("  MuSiC  ") == "music"


def test_unknown_category_is_rejected():
    with pytest.raises(ValueError, match="Invalid category"):
        normalize_category("not-a-category")
