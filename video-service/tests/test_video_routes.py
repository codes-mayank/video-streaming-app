import asyncio
from datetime import datetime
from io import BytesIO
from types import SimpleNamespace

import pytest
from fastapi import BackgroundTasks, HTTPException, UploadFile
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.api import videos as api
from app.database import Base
from app.models import Subscription, User, Video, VideoComment, VideoLike
from app.schemas import CommentCreateRequest, TranscodeUpdateRequest, VideoUploadInitRequest


def run(coro):
    return asyncio.run(coro)


@pytest.fixture
def db(monkeypatch):
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    cache = {}
    monkeypatch.setattr(api, "get_cache", lambda key: cache.get(key))
    monkeypatch.setattr(api, "set_cache", lambda key, value, **kwargs: cache.__setitem__(key, value))
    monkeypatch.setattr(api, "get_likes_count", lambda video_id: None)
    monkeypatch.setattr(api, "set_likes_count", lambda *args: None)
    monkeypatch.setattr(api, "get_comments_count", lambda video_id: None)
    monkeypatch.setattr(api, "set_comments_count", lambda *args: None)
    monkeypatch.setattr(api, "adjust_likes_count", lambda *args: None)
    for name in (
        "invalidate_video_caches", "invalidate_engagement_caches", "invalidate_comments_cache",
        "invalidate_video_detail_cache",
    ):
        monkeypatch.setattr(api, name, lambda *args: None)
    monkeypatch.setattr(api, "get_current_user_optional", lambda request: getattr(request, "user", None))
    monkeypatch.setattr(api, "list_cache_key", lambda *args: f"list:{args}")
    monkeypatch.setattr(api, "search_cache_key", lambda *args: f"search:{args}")
    monkeypatch.setattr(api, "most_liked_cache_key", lambda *args: f"most-liked:{args}")
    monkeypatch.setattr(api, "comments_cache_key", lambda *args: f"comments:{args}")
    monkeypatch.setattr(api, "try_publish_engagement_event", lambda **kwargs: (True, None))
    monkeypatch.setattr(api, "try_publish_subscription_event", lambda **kwargs: (True, None))
    monkeypatch.setattr(api.settings, "AWS_ACCESS_KEY_ID", "key")
    monkeypatch.setattr(api.settings, "AWS_SECRET_ACCESS_KEY", "secret")
    monkeypatch.setattr(api.settings, "AWS_ENDPOINT_URL", "https://storage.example")
    with Session(engine, expire_on_commit=False) as session:
        yield session
    engine.dispose()


def video(db, title="Movie", *, owner="7", status="ready", category="music", **kwargs):
    item = Video(
        title=title,
        file_key=f"raw/{title}-{len(db.query(Video).all())}.mp4",
        status=status,
        content_type="video/mp4",
        size_bytes=10,
        user_id=owner,
        category=category,
        **kwargs,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def viewer(user_id=7, sub="alice"):
    return SimpleNamespace(user_id=user_id, sub=sub)


def request(user=None, **query_params):
    return SimpleNamespace(user=user, query_params=query_params)


def test_upload_lifecycle_and_transcode_update(db, monkeypatch):
    monkeypatch.setattr(api, "generate_presigned_upload_url", lambda **kwargs: "https://upload.example")
    monkeypatch.setattr(api, "check_object_exists", lambda key: True)
    monkeypatch.setattr(api, "try_publish_transcode_job", lambda *args, **kwargs: (True, None))
    payload = VideoUploadInitRequest(
        title="Concert", video_name="Concert", content_type="video/mp4", size_bytes=12,
        user_id="7", thumbnail_content_type="image/png", thumbnail_size_bytes=3, category="music",
    )

    started = api.initiate_upload(payload, db)
    assert started.video_id > 0
    assert started.thumbnail_key.endswith("thumbnail.png")
    assert started.upload_url == "https://upload.example"
    assert started.thumbnail_upload_url == "https://upload.example"

    file = UploadFile(filename="concert.mp4", file=BytesIO(b"video"), headers={"content-type": "video/mp4"})
    uploaded = []
    monkeypatch.setattr(api, "get_s3_client", lambda: SimpleNamespace(upload_fileobj=lambda *a, **kw: uploaded.append((a, kw))))
    assert run(api.upload_file_to_storage(started.video_id, file, db)).status_code == 204
    thumbnail = UploadFile(filename="cover.png", file=BytesIO(b"png"), headers={"content-type": "image/png"})
    assert run(api.upload_thumbnail_to_storage(started.video_id, thumbnail, db)).status_code == 204
    assert len(uploaded) == 2

    completed = api.complete_upload(started.video_id, db)
    assert completed.status == "uploaded"
    assert completed.transcode_job_queued is True
    updated = api.update_transcode_result(
        started.video_id,
        TranscodeUpdateRequest(status="ready", hls_master_key="users/7/concert/master.m3u8", duration_seconds=23),
        db,
    )
    assert updated.status == "ready"
    assert db.get(Video, started.video_id).duration_seconds == 23


def test_upload_rejects_invalid_content_and_missing_objects(db, monkeypatch):
    bad = VideoUploadInitRequest(title="Text", video_name="text", content_type="text/plain", size_bytes=1, user_id="7")
    with pytest.raises(HTTPException) as invalid:
        api.initiate_upload(bad, db)
    assert invalid.value.status_code == 400

    item = video(db, status="upload_initiated")
    monkeypatch.setattr(api, "check_object_exists", lambda key: False)
    with pytest.raises(HTTPException) as missing:
        api.complete_upload(item.id, db)
    assert missing.value.status_code == 409


def test_listing_search_latest_and_most_liked(db):
    first = video(db, "Music A")
    second = video(db, "Music B")
    video(db, "News", category="news", created_at=datetime(2030, 1, 1))
    db.add_all([VideoLike(user_id=7, video_id=first.id), VideoLike(user_id=8, video_id=first.id)])
    db.commit()

    assert api.list_categories()["default"] == "other"
    page = api.list_videos(request(viewer()), limit=2, cursor_id=None, category="music", db=db)
    assert [v.id for v in page.items] == [second.id, first.id]
    assert page.items[1].like_count == 2
    assert api.list_videos(request(viewer()), limit=2, cursor_id=None, category="music", db=db).items[1].id == first.id
    found = api.search_videos(request(), query="music", limit=1, cursor_id=None, db=db)
    assert found.has_more and found.next_cursor == second.id
    assert api.search_videos(request(), query="music", limit=1, cursor_id=second.id, db=db).items[0].id == first.id
    assert api.get_latest_video(request(), db).title == "News"
    assert api.get_latest_video(request(), db).title == "News"
    ranked = api.get_most_liked_videos(request(viewer()), limit=5, db=db)
    assert [(v.id, v.like_count) for v in ranked] == [(first.id, 2)]


def test_hls_playlist_rewriting_and_object_path_guard(db, monkeypatch):
    item = video(db, hls_master_key="users/7/movie/master.m3u8", thumbnail_key="covers/movie.png")
    monkeypatch.setattr(api, "_fetch_object_bytes", lambda key: (b"#EXTM3U\n720p/movie.m3u8\n", "application/vnd.apple.mpegurl"))
    master = api.get_hls_master_playlist(item.id, db)
    assert f"/api/videos/{item.id}/hls/object?key=users/7/movie/720p/movie.m3u8" in master.body.decode()
    with pytest.raises(HTTPException) as escaped:
        api.get_hls_object(item.id, "other/video.ts", db)
    assert escaped.value.status_code == 400
    segment = api.get_hls_object(item.id, "users/7/movie/720p/movie.m3u8", db)
    assert b"/api/videos/" in segment.body
    assert api.get_raw_video_file(item.id, db).status_code == 200
    assert api.get_video_thumbnail(item.id, db).headers["etag"] == '"covers/movie.png"'


def test_likes_comments_and_delete_permissions(db, monkeypatch):
    item = video(db)
    user = viewer()
    liked = api.like_video(item.id, db, user)
    assert liked.liked and liked.like_count == 1
    db.add(VideoLike(user_id=user.user_id, video_id=item.id))
    db.commit()
    assert api.get_like_status(item.id, request(user), db).liked is True
    assert api.unlike_video(item.id, db, user).liked is False

    created = api.create_comment(item.id, CommentCreateRequest(body="  nice  "), db, user)
    assert created.body == "nice" and created.is_owner
    db.add(VideoComment(video_id=item.id, user_id=user.user_id, username=user.sub, body="stored"))
    db.commit()
    listed = api.list_comments(item.id, request(user), limit=10, cursor_id=None, db=db)
    assert listed.total == 1 and listed.items[0].is_owner
    assert api.delete_comment(item.id, listed.items[0].id, request(), db, user).status_code == 204
    assert api.delete_comment(item.id, 999, request(client_id=created.client_id), db, user).status_code == 204
    with pytest.raises(HTTPException) as forbidden:
        api.delete_video(item.id, db, viewer(99))
    assert forbidden.value.status_code == 403
    assert api.delete_video(item.id, db, user).status_code == 204


def test_channels_subscriptions_and_view(db, monkeypatch):
    owner = User(username="alice", email="a@example.com", full_name="Alice", disabled=False)
    db.add(owner)
    db.commit()
    item = video(db, owner=str(owner.id), views=4)
    db.add(Subscription(user_id=8, channel_id=owner.id))
    db.commit()
    assert api.get_channel(owner.id, db).username == "alice"
    assert api.check_subscription(owner.id, db, viewer(8)).channel_id == owner.id
    assert api.get_subscriptions(db, viewer(8))[0].id == owner.id
    assert api.list_channel_videos(owner.id, request(), limit=10, cursor_id=None, db=db).items[0].id == item.id
    assert api.subscribe_to_channel(owner.id, viewer(8)).channel_id == owner.id
    assert api.unsubscribe_from_channel(owner.id, viewer(8)).channel_id == owner.id
    tasks = BackgroundTasks()
    watched = api.get_video(item.id, request(viewer(8)), db, tasks)
    assert watched.views == 5
    assert len(tasks.tasks) == 1
