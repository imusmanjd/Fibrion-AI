"""
backend/core/models.py

SQLAlchemy ORM models.
"""

import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Uuid
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    runs = relationship("Run", back_populates="owner", cascade="all, delete-orphan")


class Run(Base):
    """
    An analysis run - one uploaded dataset's trip through the Fibrion
    pipeline. id is stored as a plain string (not a native UUID
    column, unlike User.id) because run_id is already generated as
    str(uuid.uuid4()) in api/upload.py and treated as an opaque
    string everywhere else in the codebase (URL paths, filenames,
    run_id[:8] slicing) - matching that avoids a str<->UUID
    conversion at every call site for no real benefit.
    """

    __tablename__ = "runs"

    id = Column(String, primary_key=True)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    filename = Column(String, nullable=False)
    process_type = Column(String, nullable=False)

    status = Column(String, nullable=False, default="queued")
    stage = Column(String, nullable=False, default="queued")
    message = Column(String, nullable=True)
    progress = Column(Integer, nullable=False, default=0)

    error = Column(JSON, nullable=True)
    result = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    owner = relationship("User", back_populates="runs")