from app import models  # noqa: F401 - ensures model classes are registered
from app.database import Base, engine

def setup_db():
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    setup_db()