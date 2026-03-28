from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, func, text
# from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, index=True)
    email = Column(String(100), unique=True, index=True)
    full_name = Column(String(100))
    hashed_password = Column(String(200))
    disabled = Column(Integer, default=0)
    google_id = Column(String(100), unique=True, nullable=True, index=True)

    # blogs = relationship("Blog")

    def __repr__(self):
        return f"<User(username={self.username}, email={self.email})>"


# class Blog(Base):
#     __tablename__ = "blogs"

#     id = Column(Integer, primary_key=True, index=True, autoincrement=True)
#     slug = Column(String(200), unique=True, index=True)
#     title = Column(String(200), index=True)
#     body = Column(LONGTEXT)
#     tag = Column(String(20))
#     featured_photo = Column(LONGTEXT)
#     author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
#     is_deleted = Column(Boolean, default=False)
#     created_at = Column(DateTime, server_default=func.now())
#     updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

#     author = relationship("User", back_populates="blogs")

#     @property
#     def author_name(self):
#         return self.author.full_name

#     @property
#     def author(self):
#         return self.author.username

#     def __repr__(self):
#         return f"<Blog(title={self.title}, author_id={self.author_id})>"



