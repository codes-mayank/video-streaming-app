from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, func, text
from app.database import Base


class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    file_key = Column(String(500), nullable=False, unique=True, index=True)
    status = Column(String(50), nullable=False, server_default=text("'upload_initiated'"))
    content_type = Column(String(100), nullable=False)
    size_bytes = Column(Integer, nullable=False)
    uploaded_by = Column(String(255), nullable=True)
    is_deleted = Column(Boolean, nullable=False, server_default=text("false"))
    user_id = Column(String(128), nullable=True, index=True)
    storage_base_prefix = Column(String(512), nullable=True)
    video_basename = Column(String(255), nullable=True)
    hls_master_key = Column(String(500), nullable=True)
    hls_prefix = Column(String(500), nullable=True)
    thumbnail_key = Column(String(500), nullable=True)
    thumbnail_content_type = Column(String(100), nullable=True)
    category = Column(String(50), nullable=False, server_default=text("'other'"), index=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)


class VideoLike(Base):
    __tablename__ = "video_likes"

    user_id = Column(Integer, primary_key=True)
    video_id = Column(Integer, ForeignKey("videos.id", ondelete="CASCADE"), primary_key=True, index=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
