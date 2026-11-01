from datetime import timedelta

import pytest
from fastapi import HTTPException

from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    verify_password,
    verify_token,
)


def test_password_hash_verifies_only_the_original_password():
    hashed = get_password_hash("correct horse")

    assert hashed != "correct horse"
    assert verify_password("correct horse", hashed)
    assert not verify_password("wrong password", hashed)


def test_access_token_round_trip_and_wrong_type():
    identity = {"sub": "alice", "user_id": 7, "email": "alice@example.com"}
    token = create_access_token(identity)

    assert verify_token(token, "access").model_dump() == identity
    with pytest.raises(HTTPException) as error:
        verify_token(token, "refresh")
    assert error.value.status_code == 401


def test_expired_refresh_token_is_rejected():
    identity = {"sub": "alice", "user_id": 7, "email": "alice@example.com"}
    token = create_refresh_token(identity, expires_delta=timedelta(seconds=-1))

    with pytest.raises(HTTPException) as error:
        verify_token(token, "refresh")
    assert error.value.status_code == 401
