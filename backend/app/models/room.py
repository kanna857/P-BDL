from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class RoomType(str, enum.Enum):
    lab = "Lab"
    office = "Office"
    library = "Library"
    conference = "Conference Room"
    server_room = "Server Room"
    cafeteria = "Cafeteria"
    reception = "Reception"
    storage = "Storage"
    other = "Other"


class AccessLevel(str, enum.Enum):
    full = "Full Access"
    read_only = "Read Only"
    time_restricted = "Time Restricted"
    escorted = "Escorted Only"


class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    room_type = Column(String(50), nullable=False, default="Other")
    location = Column(String(200), nullable=True)
    floor = Column(String(50), nullable=True)
    building = Column(String(100), nullable=True)
    capacity = Column(Integer, nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    requires_escort = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    access_grants = relationship("RoomAccess", back_populates="room", cascade="all, delete-orphan")


class RoomAccess(Base):
    __tablename__ = "room_access"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), nullable=True)
    access_level = Column(String(50), nullable=False, default="Full Access")
    granted_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    granted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    room = relationship("Room", back_populates="access_grants")
    user = relationship("User", foreign_keys=[user_id], backref="room_access_grants")
    role = relationship("Role", foreign_keys=[role_id], backref="room_access_grants")
    granted_by = relationship("User", foreign_keys=[granted_by_id])
