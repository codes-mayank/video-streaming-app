from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.adapter.auth import AuthAdapter


def test_signup_accepts_unique_username_and_email():
    existing = [SimpleNamespace(username="alice", email="alice@example.com")]
    new_user = SimpleNamespace(username="bob", email="bob@example.com")

    assert AuthAdapter().validate_signup_user(existing, new_user) is None


def test_signup_reports_both_conflicts():
    existing = [
        SimpleNamespace(username="alice", email="alice@example.com"),
        SimpleNamespace(username="bob", email="bob@example.com"),
    ]
    new_user = SimpleNamespace(username="alice", email="bob@example.com")

    with pytest.raises(HTTPException) as error:
        AuthAdapter().validate_signup_user(existing, new_user)

    assert error.value.status_code == 400
    assert error.value.detail == [
        {"field": "username", "message": "User already exists"},
        {"field": "email", "message": "Email already registered"},
    ]
