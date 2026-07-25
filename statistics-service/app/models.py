from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func, text

from app.database import Base


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    channel_id = Column(Integer, nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "channel_id", name="uix_user_channel"),
    )


class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    views = Column(Integer, nullable=False, server_default=text("0"))


class VideoLike(Base):
    __tablename__ = "video_likes"

    user_id = Column(Integer, primary_key=True)
    video_id = Column(Integer, ForeignKey("videos.id", ondelete="CASCADE"), primary_key=True, index=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)


class VideoComment(Base):
    __tablename__ = "video_comments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    video_id = Column(Integer, ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    username = Column(String(50), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)


class WatchHistory(Base):
    __tablename__ = "watch_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    video_id = Column(Integer, ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
