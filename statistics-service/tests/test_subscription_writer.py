from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models import Subscription
from app.services import subscription_writer


def test_latest_subscription_event_wins(monkeypatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine)
    monkeypatch.setattr(subscription_writer, "SessionLocal", sessions)
    try:
        applied = subscription_writer.apply_subscription_events(
            [
                {"user_id": 4, "channel_id": 9, "event_type": "subscribed"},
                {"user_id": 4, "channel_id": 9, "event_type": "unsubscribed"},
                {"user_id": 4, "channel_id": 9, "event_type": "subscribed"},
                {"user_id": 5, "channel_id": 9, "event_type": "subscribed"},
            ]
        )

        with sessions() as db:
            pairs = set(db.execute(select(Subscription.user_id, Subscription.channel_id)))
        assert applied == 2
        assert pairs == {(4, 9), (5, 9)}

        removed = subscription_writer.apply_subscription_events(
            [{"user_id": 4, "channel_id": 9, "event_type": "unsubscribed"}]
        )
        with sessions() as db:
            remaining = set(db.execute(select(Subscription.user_id, Subscription.channel_id)))
        assert removed == 1
        assert remaining == {(5, 9)}
    finally:
        engine.dispose()


def test_empty_batch_does_not_open_a_session(monkeypatch):
    def fail_if_called():
        raise AssertionError("SessionLocal should not be called")

    monkeypatch.setattr(subscription_writer, "SessionLocal", fail_if_called)
    assert subscription_writer.apply_subscription_events([]) == 0
