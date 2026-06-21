VIDEO_CATEGORIES = ("gaming", "music", "tech", "education", "sports", "other")
DEFAULT_VIDEO_CATEGORY = "other"


def normalize_category(value: str | None) -> str:
    if value is None or not str(value).strip():
        return DEFAULT_VIDEO_CATEGORY
    normalized = str(value).strip().lower()
    if normalized not in VIDEO_CATEGORIES:
        raise ValueError(
            f"Invalid category. Allowed: {', '.join(VIDEO_CATEGORIES)}"
        )
    return normalized
