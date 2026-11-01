import pytest

from app.services import storage_paths


def test_video_key_uses_sanitized_names_and_timestamp(monkeypatch):
    monkeypatch.setattr(storage_paths.time, "time", lambda: 1234.5)

    raw_key, prefix, basename = storage_paths.build_video_object_keys(
        "user/7", "My é Video!", "video/mp4"
    )

    assert basename == "My_e_Video"
    assert prefix == "users/user_7/1234500_My_e_Video"
    assert raw_key == f"{prefix}/raw/My_e_Video.mp4"


def test_unsupported_video_type_is_rejected():
    with pytest.raises(ValueError, match="Unsupported content type"):
        storage_paths.build_video_object_keys("7", "clip", "text/plain")


def test_thumbnail_key_uses_image_extension():
    assert (
        storage_paths.build_thumbnail_object_key("users/7/clip", "image/png")
        == "users/7/clip/thumbnail.png"
    )
