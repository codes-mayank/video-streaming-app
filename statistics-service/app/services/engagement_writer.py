from collections import defaultdict

from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from app.core.config import settings
from app.database import SessionLocal
from app.models import VideoComment, VideoLike


def _is_sqlite() -> bool:
    return settings.DATABASE_URL.startswith("sqlite")


def _insert():
    return sqlite_insert if _is_sqlite() else pg_insert


def apply_engagement_events(events: list) -> int:
    """
    Apply a batch of engagement events.

    Collapse rules:
    - liked/unliked: latest wins per (user_id, video_id)
    - comment_created/comment_deleted by client_id: latest wins per client_id
    - comment_deleted by comment_id: delete that row
    - video_viewed: increment views once per event (summed per video_id)
    """
    if not events:
        return 0

    like_by_pair = {}
    comment_by_client = {}
    comment_deletes = []
    view_counts = defaultdict(int)

    for event in events:
        event_type = event.get("event_type")
        if event_type in {"liked", "unliked"}:
            key = (int(event["user_id"]), int(event["video_id"]))
            like_by_pair[key] = event_type
        elif event_type == "comment_created":
            client_id = event.get("client_id")
            if client_id:
                comment_by_client[client_id] = event
        elif event_type == "comment_deleted":
            client_id = event.get("client_id")
            comment_id = event.get("comment_id")
            if client_id:
                comment_by_client[client_id] = event
            elif comment_id is not None:
                comment_deletes.append(int(comment_id))
        elif event_type == "video_viewed":
            view_counts[int(event["video_id"])] += 1

    db = SessionLocal()
    applied = 0
    try:
        for (user_id, video_id), event_type in like_by_pair.items():
            if event_type == "liked":
                stmt = (
                    _insert()(VideoLike)
                    .values(user_id=user_id, video_id=video_id)
                    .on_conflict_do_nothing(index_elements=["user_id", "video_id"])
                )
                db.execute(stmt)
            else:
                db.query(VideoLike).filter(
                    VideoLike.user_id == user_id,
                    VideoLike.video_id == video_id,
                ).delete(synchronize_session=False)
            applied += 1

        for _client_id, event in comment_by_client.items():
            if event.get("event_type") == "comment_deleted":
                continue
            db.add(
                VideoComment(
                    video_id=int(event["video_id"]),
                    user_id=int(event["user_id"]),
                    username=str(event["username"]),
                    body=str(event["body"]),
                )
            )
            applied += 1

        for comment_id in comment_deletes:
            deleted = (
                db.query(VideoComment)
                .filter(VideoComment.id == comment_id)
                .delete(synchronize_session=False)
            )
            if deleted:
                applied += 1

        for video_id, count in view_counts.items():
            db.execute(
                text("UPDATE videos SET views = views + :count WHERE id = :video_id"),
                {"count": count, "video_id": video_id},
            )
            applied += 1

        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    return applied
