import base64
import binascii

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import (
    effective_r2_access_key_id,
    effective_r2_endpoint_url,
    effective_r2_secret_access_key,
    settings,
)
from app.database import get_db
from app.models import Video
from app.schemas import (
    VideoCompleteUploadResponse,
    VideoListResponse,
    VideoProxyUploadRequest,
    VideoResponse,
    VideoUploadJsonRequest,
    VideoUploadInitRequest,
    VideoUploadInitResponse,
)
from app.services.r2 import (
    build_file_key,
    check_object_exists,
    generate_presigned_upload_url,
    is_supported_video_content_type,
    upload_video_bytes,
)

router = APIRouter()


def _require_r2_config() -> None:
    required_values = [
        effective_r2_access_key_id(),
        effective_r2_secret_access_key(),
        effective_r2_endpoint_url(),
        settings.R2_BUCKET_NAME,
    ]
    if not all(required_values):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="R2 is not configured. Set R2_* environment variables.",
        )


def _build_playback_url(video: Video) -> str | None:
    if settings.R2_PUBLIC_BASE_URL:
        return f"{settings.R2_PUBLIC_BASE_URL.rstrip('/')}/{video.file_key}"
    return None

#TODO: We also need Database support for transcoder
@router.post("/upload/initiate", response_model=VideoUploadInitResponse, status_code=status.HTTP_201_CREATED)
def initiate_upload(payload: VideoUploadInitRequest, db: Session = Depends(get_db)):
    _require_r2_config()
    if not is_supported_video_content_type(payload.content_type):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported content type. Only video files are allowed.",
        )

    file_key = build_file_key(payload.content_type)
    upload_url = generate_presigned_upload_url(file_key=file_key, content_type=payload.content_type)

    video = Video(
        title=payload.title,
        description=payload.description,
        file_key=file_key,
        status="upload_initiated",
        content_type=payload.content_type,
        size_bytes=payload.size_bytes,
        uploaded_by=payload.uploaded_by,
    )
    db.add(video)
    db.commit()
    db.refresh(video)

    return VideoUploadInitResponse(
        video_id=video.id,
        file_key=file_key,
        upload_url=upload_url,
        expires_in_seconds=settings.R2_PRESIGNED_EXPIRES_SECONDS,
    )


@router.post("/{video_id}/complete", response_model=VideoCompleteUploadResponse)
def complete_upload(video_id: int, db: Session = Depends(get_db)):
    _require_r2_config()

    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    if not check_object_exists(video.file_key):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Upload not found in object storage. Ensure client uploaded the file.",
        )
    if not is_supported_video_content_type(video.content_type):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid video content type.",
        )

    video.status = "uploaded"
    db.add(video)
    db.commit()
    db.refresh(video)

    return VideoCompleteUploadResponse(
        id=video.id,
        status=video.status,
        file_key=video.file_key,
        bucket=settings.R2_BUCKET_NAME,
    )


@router.post("/{video_id}/upload-proxy")
def upload_proxy(video_id: int, payload: VideoProxyUploadRequest, db: Session = Depends(get_db)):
    _require_r2_config()

    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    if not is_supported_video_content_type(payload.content_type):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported content type. Only video files are allowed.",
        )

    try:
        file_bytes = base64.b64decode(payload.file_base64, validate=True)
    except (ValueError, binascii.Error):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid base64 payload")

    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file payload")

    upload_video_bytes(file_key=video.file_key, content_type=payload.content_type, data=file_bytes)
    return {"video_id": video.id, "status": "uploaded_to_storage"}


@router.post("/upload-json", response_model=VideoCompleteUploadResponse, status_code=status.HTTP_201_CREATED)
def upload_json(payload: VideoUploadJsonRequest, db: Session = Depends(get_db)):
    _require_r2_config()
    if not is_supported_video_content_type(payload.content_type):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported content type. Only video files are allowed.",
        )

    try:
        file_bytes = base64.b64decode(payload.file_base64, validate=True)
    except (ValueError, binascii.Error):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid base64 payload")

    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file payload")

    file_key = build_file_key(payload.content_type)
    upload_video_bytes(file_key=file_key, content_type=payload.content_type, data=file_bytes)
    if not check_object_exists(file_key):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Upload to object storage could not be verified.",
        )

    video = Video(
        title=payload.title,
        description=payload.description,
        file_key=file_key,
        status="uploaded",
        content_type=payload.content_type,
        size_bytes=len(file_bytes),
        uploaded_by=payload.uploaded_by,
    )
    db.add(video)
    db.commit()
    db.refresh(video)

    return VideoCompleteUploadResponse(
        id=video.id,
        status=video.status,
        file_key=video.file_key,
        bucket=settings.R2_BUCKET_NAME,
    )


@router.get("", response_model=VideoListResponse)
def list_videos(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    total = db.query(func.count(Video.id)).scalar() or 0
    videos = db.query(Video).order_by(Video.created_at.desc()).offset(offset).limit(limit).all()

    items = []
    for video in videos:
        item = VideoResponse.model_validate(video)
        item.playback_url = _build_playback_url(video)
        items.append(item)

    return VideoListResponse(items=items, limit=limit, offset=offset, total=total)

# TODO: Update this endpoint to not send public url, use streaming response instead
@router.get("/{video_id}", response_model=VideoResponse)
def get_video(video_id: int, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    response = VideoResponse.model_validate(video)
    response.playback_url = _build_playback_url(video)
    return response

#TODO: We can remove it as we do not want download functionality
# @router.get("/{video_id}/download-url")
# def get_download_url(video_id: int, expires_seconds: int = Query(default=900, ge=60, le=3600), db: Session = Depends(get_db)):
#     _require_r2_config()

#     video = db.query(Video).filter(Video.id == video_id).first()
#     if not video:
#         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

#     url = generate_presigned_download_url(video.file_key, expires_seconds=expires_seconds)
#     return {"video_id": video.id, "download_url": url, "expires_in_seconds": expires_seconds}
