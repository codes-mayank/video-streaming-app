from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, func, Text
# from sqlalchemy.dialects.mysql import LONGTEXT
# from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, index=True)
    email = Column(String(100), unique=True, index=True)
    full_name = Column(String(100))
    hashed_password = Column(String(200), nullable=True)
    disabled = Column(Boolean, default=False)
    google_id = Column(String(100), unique=True, nullable=True, index=True)
    profile_image_url = Column(Text, nullable=True)

    def __repr__(self):
        return f"<User(username={self.username}, email={self.email})>"