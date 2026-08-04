import threading
import time
import traceback
from typing import Any, Callable, Dict, List, Optional

from app.core.config import settings
from app.services.engagement_writer import apply_engagement_events
from app.services.kafka_queue import (
    get_engagement_events_consumer,
    get_subscription_events_consumer,
)
from app.services.subscription_writer import apply_subscription_events


def _normalize_subscription_event(payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    event_type = payload.get("event_type")
    user_id = payload.get("user_id")
    channel_id = payload.get("channel_id")

    if event_type not in {"subscribed", "unsubscribed"}:
        return None
    if user_id is None or channel_id is None:
        return None

    return {
        "event_type": event_type,
        "user_id": int(user_id),
        "channel_id": int(channel_id),
    }


def _normalize_engagement_event(payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    event_type = payload.get("event_type")
    if event_type not in {
        "liked",
        "unliked",
        "comment_created",
        "comment_deleted",
        "video_viewed",
    }:
        return None

    event = dict(payload)
    event["event_type"] = event_type

    if event_type in {"liked", "unliked"}:
        if event.get("user_id") is None or event.get("video_id") is None:
            return None
        event["user_id"] = int(event["user_id"])
        event["video_id"] = int(event["video_id"])
    elif event_type == "comment_created":
        if (
            event.get("user_id") is None
            or event.get("video_id") is None
            or not event.get("username")
            or event.get("body") is None
            or not event.get("client_id")
        ):
            return None
        event["user_id"] = int(event["user_id"])
        event["video_id"] = int(event["video_id"])
        event["body"] = str(event["body"]).strip()
        if not event["body"]:
            return None
    elif event_type == "comment_deleted":
        if event.get("user_id") is None or event.get("video_id") is None:
            return None
        if event.get("comment_id") is None and not event.get("client_id"):
            return None
        event["user_id"] = int(event["user_id"])
        event["video_id"] = int(event["video_id"])
        if event.get("comment_id") is not None:
            event["comment_id"] = int(event["comment_id"])
    elif event_type == "video_viewed":
        if event.get("video_id") is None:
            return None
        event["video_id"] = int(event["video_id"])
        if event.get("user_id") is not None:
            event["user_id"] = int(event["user_id"])

    return event


def _run_batch_consumer(
    *,
    label: str,
    get_consumer: Callable,
    normalize: Callable[[Dict[str, Any]], Optional[Dict[str, Any]]],
    apply_events: Callable[[List[Dict[str, Any]]], int],
    batch_size: int,
    flush_seconds: float,
    poll_timeout_ms: int,
    exit_on_idle: bool,
    max_idle_polls: int,
) -> int:
    print(f"[statistics] starting {label} batch consumer", flush=True)
    print(
        f"[statistics] {label} config batch_size={batch_size} "
        f"flush_seconds={flush_seconds} poll_timeout_ms={poll_timeout_ms}",
        flush=True,
    )
    consumer = get_consumer()
    print(f"[statistics] waiting for {label}", flush=True)

    batch: List[Dict[str, Any]] = []
    batch_deadline: Optional[float] = None

    def flush(reason: str) -> None:
        nonlocal batch, batch_deadline
        if not batch:
            batch_deadline = None
            return

        pending = batch
        waited = None
        if batch_deadline is not None:
            waited = flush_seconds - max(0.0, batch_deadline - time.monotonic())

        batch = []
        batch_deadline = None
        try:
            applied = apply_events(pending)
            consumer.commit()
            waited_label = f"{waited:.2f}s" if waited is not None else "n/a"
            print(
                f"[statistics] {label} flushed {len(pending)} event(s), "
                f"applied {applied} write(s) "
                f"(reason={reason}, waited≈{waited_label})",
                flush=True,
            )
        except Exception:
            batch = pending + batch
            if batch and batch_deadline is None:
                batch_deadline = time.monotonic() + flush_seconds
            raise

    idle_polls = 0

    while True:
        try:
            now = time.monotonic()
            if batch and batch_deadline is not None:
                remaining_ms = int(max(0.0, (batch_deadline - now) * 1000))
                timeout_ms = min(poll_timeout_ms, remaining_ms)
            else:
                timeout_ms = poll_timeout_ms

            records = consumer.poll(
                timeout_ms=timeout_ms,
                max_records=batch_size,
            )
            got_messages = any(messages for messages in records.values())
            if got_messages:
                idle_polls = 0
            elif not batch:
                idle_polls += 1

            for _tp, messages in records.items():
                for msg in messages:
                    event = normalize(msg.value or {})
                    if event is None:
                        print(
                            f"[statistics] {label} ignoring invalid event: {msg.value}",
                            flush=True,
                        )
                        continue

                    if not batch:
                        batch_deadline = time.monotonic() + flush_seconds
                        print(
                            f"[statistics] {label} batch window opened; "
                            f"will flush in {flush_seconds:.1f}s "
                            f"or at {batch_size} events",
                            flush=True,
                        )

                    batch.append(event)
                    remaining = (
                        max(0.0, batch_deadline - time.monotonic())
                        if batch_deadline is not None
                        else flush_seconds
                    )
                    print(
                        f"[statistics] {label} queued "
                        f"event_type={event.get('event_type')} "
                        f"(pending={len(batch)}, flush_in≈{remaining:.1f}s)",
                        flush=True,
                    )

            if not batch and exit_on_idle and idle_polls >= max(1, max_idle_polls):
                print(
                    f"[statistics] {label} idle for {idle_polls} poll(s); exiting",
                    flush=True,
                )
                return 0

            if not batch:
                continue

            if len(batch) >= batch_size:
                flush("batch_size")
                continue

            if batch_deadline is not None and time.monotonic() >= batch_deadline:
                flush("flush_seconds")
        except Exception as exc:
            print(f"[statistics] {label} batch loop error: {exc}", flush=True)
            traceback.print_exc()
            time.sleep(1)


def _consumer_thread(
    result_map: Dict[str, int],
    *,
    key: str,
    kwargs: Dict[str, Any],
) -> None:
    try:
        result_map[key] = _run_batch_consumer(**kwargs)
    except Exception:
        result_map[key] = 1
        traceback.print_exc()


def main() -> int:
    thread_results: Dict[str, int] = {}
    subscription_kwargs = {
        "label": "subscription-events",
        "get_consumer": get_subscription_events_consumer,
        "normalize": _normalize_subscription_event,
        "apply_events": apply_subscription_events,
        "batch_size": settings.SUBSCRIPTION_BATCH_SIZE,
        "flush_seconds": float(settings.SUBSCRIPTION_BATCH_FLUSH_SECONDS),
        "poll_timeout_ms": int(settings.SUBSCRIPTION_POLL_TIMEOUT_MS),
        "exit_on_idle": bool(settings.STATS_EXIT_ON_IDLE),
        "max_idle_polls": int(settings.STATS_MAX_IDLE_POLLS),
    }
    engagement_kwargs = {
        "label": "engagement-events",
        "get_consumer": get_engagement_events_consumer,
        "normalize": _normalize_engagement_event,
        "apply_events": apply_engagement_events,
        "batch_size": settings.ENGAGEMENT_BATCH_SIZE,
        "flush_seconds": float(settings.ENGAGEMENT_BATCH_FLUSH_SECONDS),
        "poll_timeout_ms": int(settings.ENGAGEMENT_POLL_TIMEOUT_MS),
        "exit_on_idle": bool(settings.STATS_EXIT_ON_IDLE),
        "max_idle_polls": int(settings.STATS_MAX_IDLE_POLLS),
    }
    subscription_thread = threading.Thread(
        target=_consumer_thread,
        kwargs={
            "result_map": thread_results,
            "key": "subscription-events",
            "kwargs": subscription_kwargs,
        },
        name="subscription-events-consumer",
        daemon=True,
    )
    engagement_thread = threading.Thread(
        target=_consumer_thread,
        kwargs={
            "result_map": thread_results,
            "key": "engagement-events",
            "kwargs": engagement_kwargs,
        },
        name="engagement-events-consumer",
        daemon=True,
    )
    subscription_thread.start()
    engagement_thread.start()
    print("[statistics] both consumers running", flush=True)
    subscription_thread.join()
    engagement_thread.join()
    print(f"[statistics] consumers finished: {thread_results}", flush=True)
    return 1 if any(code != 0 for code in thread_results.values()) else 0


if __name__ == "__main__":
    raise SystemExit(main())
