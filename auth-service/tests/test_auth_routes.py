import asyncio
from io import BytesIO
from types import SimpleNamespace

import pytest
from fastapi import HTTPException, Response, UploadFile
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.api import auth
from app.database import Base
from app.models import User
from app.schemas import (
    EditProfileRequest,
    GoogleLoginRequest,
    ProfileImageUploadCompleteRequest,
    ProfileImageUploadInitRequest,
    Token,
    UserIn,
    UserLogin,
)


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine, expire_on_commit=False) as session:
        yield session
    engine.dispose()


def run(coro):
    return asyncio.run(coro)


def request_with_cookies(cookies):
    return SimpleNamespace(cookies=cookies)


def test_signup_login_refresh_and_logout(db):
    response = Response()
    user = run(auth.signup(response, UserIn(username="alice", email="a@example.com", password="secret"), db))
    assert user.id is not None
    assert len(response.headers.getlist("set-cookie")) == 2

    with pytest.raises(HTTPException) as duplicate:
        run(auth.signup(Response(), UserIn(username="alice", email="other@example.com", password="secret"), db))
    assert duplicate.value.status_code == 400

    logged_in = run(auth.login(Response(), UserLogin(username_or_email="a@example.com", password="secret"), db))
    assert logged_in.id == user.id
    for bad_login in (
        UserLogin(username_or_email="missing", password="secret"),
        UserLogin(username_or_email="alice", password="wrong"),
    ):
        with pytest.raises(HTTPException) as invalid:
            run(auth.login(Response(), bad_login, db))
        assert invalid.value.status_code == 400

    refresh_token = auth.create_refresh_token(auth.create_token_payload(user).model_dump())
    refreshed = Response()
    assert run(auth.refresh_session(request_with_cookies({"refresh_token": refresh_token}), refreshed, db)) == {
        "message": "Session refreshed"
    }
    assert len(refreshed.headers.getlist("set-cookie")) == 2
    with pytest.raises(HTTPException) as missing:
        run(auth.refresh_session(request_with_cookies({}), Response(), db))
    assert missing.value.status_code == 401

    logged_out = Response()
    assert run(auth.logout(logged_out))["message"] == "Logged out successfully"
    assert len(logged_out.headers.getlist("set-cookie")) == 2


def test_profile_edit_and_me(db):
    user = User(username="alice", email="a@example.com", hashed_password="hash")
    db.add(user)
    db.commit()
    token = Token(sub="alice", user_id=user.id, email=user.email)

    updated = run(auth.edit_profile(EditProfileRequest(username="newname", full_name="Alice"), token, db))
    assert (updated.username, updated.full_name) == ("newname", "Alice")
    assert run(auth.read_users_me(token, db)).id == user.id

    db.add(User(username="taken", email="taken@example.com"))
    db.commit()
    with pytest.raises(HTTPException) as conflict:
        run(auth.edit_profile(EditProfileRequest(username="taken"), token, db))
    assert conflict.value.status_code == 400
    with pytest.raises(HTTPException) as missing:
        run(auth.read_users_me(Token(sub="nobody", user_id=999, email="x@example.com"), db))
    assert missing.value.status_code == 404


def test_profile_photo_flow_validates_owner_and_storage(db, monkeypatch):
    user = User(username="alice", email="a@example.com")
    db.add(user)
    db.commit()
    token = Token(sub="alice", user_id=user.id, email=user.email)
    monkeypatch.setattr(auth, "_require_storage_config", lambda: None)
    monkeypatch.setattr(auth, "generate_presigned_upload_url", lambda key, content_type: "https://upload.example")
    monkeypatch.setattr(auth, "check_object_exists", lambda key: True)
    monkeypatch.setattr(auth, "build_public_url", lambda key: "https://cdn.example/photo.png")

    initiated = run(auth.profile_photo_upload_initiate(ProfileImageUploadInitRequest(content_type="image/png"), token))
    assert initiated.file_key.startswith(f"profile-photos/{user.id}/")
    assert initiated.upload_url == "https://upload.example"
    with pytest.raises(HTTPException) as invalid_type:
        run(auth.profile_photo_upload_initiate(ProfileImageUploadInitRequest(content_type="text/plain"), token))
    assert invalid_type.value.status_code == 400

    uploaded = []
    monkeypatch.setattr(auth, "get_s3_client", lambda: SimpleNamespace(upload_fileobj=lambda *a, **kw: uploaded.append((a, kw))))
    file = UploadFile(filename="photo.png", file=BytesIO(b"image"), headers={"content-type": "image/png"})
    assert run(auth.upload_profile_photo_to_storage(initiated.file_key, file, token)).status_code == 204
    assert uploaded[0][0][1] == auth.settings.AWS_BUCKET_NAME

    completed = run(auth.profile_photo_upload_complete(ProfileImageUploadCompleteRequest(file_key=initiated.file_key), token, db))
    assert completed.profile_image_url == "https://cdn.example/photo.png"
    assert user.profile_image_url == completed.profile_image_url
    with pytest.raises(HTTPException) as other_user:
        run(auth.profile_photo_upload_complete(ProfileImageUploadCompleteRequest(file_key="profile-photos/999/photo.png"), token, db))
    assert other_user.value.status_code == 403


def test_google_login_links_existing_user(db, monkeypatch):
    user = User(username="alice", email="a@example.com", disabled=False)
    db.add(user)
    db.commit()
    monkeypatch.setattr(auth.id_token, "verify_oauth2_token", lambda *args: {
        "iss": "accounts.google.com", "email": "a@example.com", "sub": "google-1", "picture": "https://image.example/a"
    })

    linked = run(auth.google_login(GoogleLoginRequest(token="valid"), Response(), db))
    assert linked.id == user.id
    assert linked.google_id == "google-1"

    monkeypatch.setattr(auth.id_token, "verify_oauth2_token", lambda *args: {"iss": "wrong"})
    with pytest.raises(HTTPException) as invalid:
        run(auth.google_login(GoogleLoginRequest(token="bad"), Response(), db))
    assert invalid.value.status_code == 401
