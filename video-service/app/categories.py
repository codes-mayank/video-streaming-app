VIDEO_CATEGORIES = (
    "technology",
    "programming",
    "artificial-intelligence",
    "education",
    "gaming",
    "music",
    "entertainment",
    "sports",
    "news",
    "movies-tv",
    "science",
    "business",
    "finance",
    "lifestyle",
    "travel",
    "food-cooking",
    "health-fitness",
    "fashion-beauty",
    "photography",
    "art-design",
    "animation",
    "diy-crafts",
    "automobiles",
    "pets-animals",
    "nature",
    "history",
    "podcasts",
    "comedy",
    "vlogs",
    "kids",
    "short-films",
    "documentaries",
    "other",
)
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
