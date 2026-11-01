from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models import Video, VideoComment, VideoLike
from app.services import engagement_writer


def test_engagement_batch_collapses_toggles_and_sums_views(monkeypatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine)
    monkeypatch.setattr(engagement_writer, "SessionLocal", sessions)
    reconciled = []
    monkeypatch.setattr(
        engagement_writer,
        "reconcile_engagement_caches",
        lambda db, **kwargs: reconciled.append(kwargs),
    )
    try:
        with sessions.begin() as db:
            db.add(Video(id=11, views=0))

        applied = engagement_writer.apply_engagement_events(
            [
                {"event_type": "liked", "user_id": 3, "video_id": 11},
                {"event_type": "unliked", "user_id": 3, "video_id": 11},
                {"event_type": "liked", "user_id": 3, "video_id": 11},
                {"event_type": "video_viewed", "video_id": 11},
                {"event_type": "video_viewed", "video_id": 11},
                {
                    "event_type": "comment_created",
                    "client_id": "draft-1",
                    "video_id": 11,
                    "user_id": 3,
                    "username": "alice",
                    "body": "first draft",
                },
                {"event_type": "comment_deleted", "client_id": "draft-1"},
            ]
        )

        with sessions() as db:
            assert db.scalar(select(Video.views).where(Video.id == 11)) == 2
            assert db.scalars(select(VideoLike)).all()[0].user_id == 3
            assert db.scalars(select(VideoComment)).all() == []
        assert applied == 2
        assert reconciled == [{"like_video_ids": {11}, "comment_video_ids": set()}]
    finally:
        engine.dispose()


def test_empty_engagement_batch_does_not_open_a_session(monkeypatch):
    def fail_if_called():
        raise AssertionError("SessionLocal should not be called")

    monkeypatch.setattr(engagement_writer, "SessionLocal", fail_if_called)
    assert engagement_writer.apply_engagement_events([]) == 0
