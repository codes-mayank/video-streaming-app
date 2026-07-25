from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from app.core.config import settings
from app.database import SessionLocal
from app.models import Subscription


def _is_sqlite() -> bool:
    return settings.DATABASE_URL.startswith("sqlite")


def apply_subscription_events(events: list[dict]) -> int:
    """
    Apply a batch of subscription events to the database.

    Events for the same (user_id, channel_id) are collapsed to the latest one
    so rapid toggle spam only performs one final write per pair.
    """
    if not events:
        return 0

    latest_by_pair: dict[tuple[int, int], dict] = {}
    for event in events:
        key = (int(event["user_id"]), int(event["channel_id"]))
        latest_by_pair[key] = event

    db = SessionLocal()
    applied = 0
    try:
        for (user_id, channel_id), event in latest_by_pair.items():
            event_type = event["event_type"]
            if event_type == "subscribed":
                insert = sqlite_insert if _is_sqlite() else pg_insert
                stmt = (
                    insert(Subscription)
                    .values(user_id=user_id, channel_id=channel_id)
                    .on_conflict_do_nothing(index_elements=["user_id", "channel_id"])
                )
                db.execute(stmt)
                applied += 1
            elif event_type == "unsubscribed":
                deleted = (
                    db.query(Subscription)
                    .filter(
                        Subscription.user_id == user_id,
                        Subscription.channel_id == channel_id,
                    )
                    .delete(synchronize_session=False)
                )
                applied += 1 if deleted is not None else 0
            else:
                print(f"[statistics] skipping unknown event_type={event_type}", flush=True)
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    return applied
