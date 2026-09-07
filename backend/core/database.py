"""
backend/core/database.py

SQLAlchemy engine and session setup. Everything else that touches
the database imports from here rather than creating its own engine -
one connection pool for the whole app.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from core.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """
    FastAPI dependency — yields a session for the duration of one
    request, and always closes it afterward, even if the request
    raised an exception.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()