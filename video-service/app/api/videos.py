import base64
import binascii
import mimetypes
from pathlib import PurePosixPath

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import get_db
from app.models import Video
from app.schemas import (
    TranscodeUpdateRequest,
    VideoCompleteUploadResponse,
    VideoListResponse,
    VideoResponse,
    VideoUploadJsonRequest,
    VideoUploadInitRequest,
    VideoUploadInitResponse,
)
from app.services.s3 import (
    check_object_exists,
    generate_presigned_upload_url,
    get_s3_client,
    is_supported_video_content_type,
    upload_video_bytes,
)
from app.services.storage_paths import build_video_object_keys
from app.services.kafka_queue import try_publish_transcode_job

router = APIRouter()


def _require_storage_config() -> None:
    required_values = [
        settings.AWS_ACCESS_KEY_ID,
        settings.AWS_SECRET_ACCESS_KEY,
        settings.AWS_ENDPOINT_URL,
        settings.AWS_BUCKET_NAME,
    ]
    if not all(required_values):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Storage is not configured. Set AWS_* environment variables.",
        )


def _build_playback_url(video: Video) -> str | None:
    if video.hls_master_key:
        return f"/videos/{video.id}/hls/master.m3u8"
    if video.file_key:
        return f"/videos/{video.id}/file"

    key = video.hls_master_key or video.file_key
    if settings.AWS_PUBLIC_BASE_URL:
        return f"{settings.AWS_PUBLIC_BASE_URL.rstrip('/')}/{key}"
    if settings.AWS_ENDPOINT_URL and settings.AWS_BUCKET_NAME:
        # Fallback for public R2/S3 bucket access when explicit public base URL is not configured.
        return f"{settings.AWS_ENDPOINT_URL.rstrip('/')}/{settings.AWS_BUCKET_NAME}/{key}"
    return None


def _guess_content_type(key: str, fallback: str = "application/octet-stream") -> str:
    guessed, _ = mimetypes.guess_type(key)
    return guessed or fallback


def _fetch_object_bytes(key: str) -> tuple[bytes, str]:
    client = get_s3_client()
    try:
        obj = client.get_object(Bucket=settings.AWS_BUCKET_NAME, Key=key)
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Object not found in storage")
    body = obj["Body"].read()
    content_type = obj.get("ContentType") or _guess_content_type(key)
    return body, content_type


def _rewrite_hls_playlist(content: str, video_id: int, current_key: str) -> str:
    base_dir = PurePosixPath(current_key).parent
    rewritten: list[str] = []
    for raw_line in content.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            rewritten.append(raw_line)
            continue
        if line.startswith("http://") or line.startswith("https://"):
            rewritten.append(raw_line)
            continue
        target_key = str((base_dir / line).as_posix())
        rewritten.append(f"/videos/{video_id}/hls/object?key={target_key}")
    return "\n".join(rewritten) + "\n"

#TODO: We also need Database support for transcoder
@router.post("/upload/initiate", response_model=VideoUploadInitResponse, status_code=status.HTTP_201_CREATED)
def initiate_upload(payload: VideoUploadInitRequest, db: Session = Depends(get_db)):
    _require_storage_config()
    if not is_supported_video_content_type(payload.content_type):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported content type. Only video files are allowed.",
        )

    raw_key, storage_base_prefix, video_basename = build_video_object_keys(
        payload.user_id, payload.video_name, payload.content_type
    )
    upload_url = generate_presigned_upload_url(file_key=raw_key, content_type=payload.content_type)

    video = Video(
        title=payload.title,
        description=payload.description,
        file_key=raw_key,
        status="upload_initiated",
        content_type=payload.content_type,
        size_bytes=payload.size_bytes,
        uploaded_by=payload.uploaded_by,
        user_id=payload.user_id,
        storage_base_prefix=storage_base_prefix,
        video_basename=video_basename,
    )
    db.add(video)
    db.commit()
    db.refresh(video)

    return VideoUploadInitResponse(
        video_id=video.id,
        file_key=raw_key,
        storage_base_prefix=storage_base_prefix,
        upload_url=upload_url,
        expires_in_seconds=settings.AWS_PRESIGNED_EXPIRES_SECONDS,
    )


@router.post("/{video_id}/upload", status_code=status.HTTP_204_NO_CONTENT)
async def upload_file_to_storage(
    video_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> Response:
    """
    Same-origin upload: browser sends the file here; the server writes to S3/R2.
    Avoids CORS on direct PUT to the pre-signed URL (bucket CORS is not required for this path).
    """
    _require_storage_config()

    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")
    if video.status != "upload_initiated":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Video is not awaiting upload. Initiate a new upload, or complete if the object is already in storage.",
        )

    incoming_ct = (file.content_type or "").strip()
    if incoming_ct and incoming_ct != video.content_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Content-Type must match initiate ({video.content_type}).",
        )

    client = get_s3_client()
    try:
        client.upload_fileobj(
            file.file,
            settings.AWS_BUCKET_NAME,
            video.file_key,
            ExtraArgs={"ContentType": video.content_type},
        )
    finally:
        await file.close()

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{video_id}/complete", response_model=VideoCompleteUploadResponse)
def complete_upload(video_id: int, db: Session = Depends(get_db)):
    _require_storage_config()

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
    queued, qerr = try_publish_transcode_job(
        video.id,
        video.file_key,
        video.content_type,
        output_base_prefix=video.storage_base_prefix,
        segment_basename=video.video_basename,
    )

    return VideoCompleteUploadResponse(
        id=video.id,
        status=video.status,
        file_key=video.file_key,
        bucket=settings.AWS_BUCKET_NAME,
        hls_output_prefix=video.storage_base_prefix or f"hls/{video.id}",
        transcode_job_queued=queued,
        transcode_queue_error=qerr,
    )


@router.post("/upload-json", response_model=VideoCompleteUploadResponse, status_code=status.HTTP_201_CREATED)
def upload_json(payload: VideoUploadJsonRequest, db: Session = Depends(get_db)):
    _require_storage_config()
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

    raw_key, storage_base_prefix, video_basename = build_video_object_keys(
        payload.user_id, payload.video_name, payload.content_type
    )
    upload_video_bytes(file_key=raw_key, content_type=payload.content_type, data=file_bytes)
    if not check_object_exists(raw_key):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Upload to object storage could not be verified.",
        )

    video = Video(
        title=payload.title,
        description=payload.description,
        file_key=raw_key,
        status="uploaded",
        content_type=payload.content_type,
        size_bytes=len(file_bytes),
        uploaded_by=payload.uploaded_by,
        user_id=payload.user_id,
        storage_base_prefix=storage_base_prefix,
        video_basename=video_basename,
    )
    db.add(video)
    db.commit()
    db.refresh(video)
    queued, qerr = try_publish_transcode_job(
        video.id,
        video.file_key,
        video.content_type,
        output_base_prefix=video.storage_base_prefix,
        segment_basename=video.video_basename,
    )

    return VideoCompleteUploadResponse(
        id=video.id,
        status=video.status,
        file_key=video.file_key,
        bucket=settings.AWS_BUCKET_NAME,
        hls_output_prefix=video.storage_base_prefix or f"hls/{video.id}",
        transcode_job_queued=queued,
        transcode_queue_error=qerr,
    )


@router.post("/{video_id}/transcode-result", response_model=VideoCompleteUploadResponse)
def update_transcode_result(video_id: int, payload: TranscodeUpdateRequest, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    video.status = payload.status
    if payload.hls_master_key is not None:
        video.hls_master_key = payload.hls_master_key
    if payload.hls_prefix is not None:
        video.hls_prefix = payload.hls_prefix

    db.add(video)
    db.commit()
    db.refresh(video)
    return VideoCompleteUploadResponse(
        id=video.id,
        status=video.status,
        file_key=video.file_key,
        bucket=settings.AWS_BUCKET_NAME,
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


@router.get("/{video_id}/hls/master.m3u8")
def get_hls_master_playlist(video_id: int, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")
    if not video.hls_master_key:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="HLS playlist is not ready yet")

    content_bytes, _ = _fetch_object_bytes(video.hls_master_key)
    text = content_bytes.decode("utf-8", errors="replace")
    rewritten = _rewrite_hls_playlist(text, video.id, video.hls_master_key)
    return Response(content=rewritten, media_type="application/vnd.apple.mpegurl")


@router.get("/{video_id}/hls/object")
def get_hls_object(video_id: int, key: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")
    if not video.hls_master_key:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="HLS playlist is not ready yet")

    hls_root = str(PurePosixPath(video.hls_master_key).parent.as_posix()).rstrip("/")
    normalized = str(PurePosixPath(key).as_posix()).lstrip("/")
    if not normalized.startswith(hls_root + "/") and normalized != hls_root:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid HLS object path")

    content_bytes, content_type = _fetch_object_bytes(normalized)

    # Variant playlists also contain relative segment paths; rewrite them to same-origin endpoints.
    if normalized.lower().endswith(".m3u8"):
        text = content_bytes.decode("utf-8", errors="replace")
        rewritten = _rewrite_hls_playlist(text, video.id, normalized)
        return Response(content=rewritten, media_type="application/vnd.apple.mpegurl")

    return Response(content=content_bytes, media_type=content_type)


@router.get("/{video_id}/file")
def get_raw_video_file(video_id: int, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    content_bytes, content_type = _fetch_object_bytes(video.file_key)
    return Response(content=content_bytes, media_type=content_type)

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
