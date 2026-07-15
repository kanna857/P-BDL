from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


# ---- Room Schemas ----

class RoomBase(BaseModel):
    name: str
    room_type: str = "Other"
    location: Optional[str] = None
    floor: Optional[str] = None
    building: Optional[str] = None
    capacity: Optional[int] = None
    description: Optional[str] = None
    requires_escort: bool = False
    is_active: bool = True


class RoomCreate(RoomBase):
    pass


class RoomUpdate(BaseModel):
    name: Optional[str] = None
    room_type: Optional[str] = None
    location: Optional[str] = None
    floor: Optional[str] = None
    building: Optional[str] = None
    capacity: Optional[int] = None
    description: Optional[str] = None
    requires_escort: Optional[bool] = None
    is_active: Optional[bool] = None


class RoomAccessSummary(BaseModel):
    id: int
    user_id: Optional[int] = None
    role_id: Optional[int] = None
    access_level: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class RoomResponse(RoomBase):
    id: int
    created_at: datetime
    access_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)


# ---- RoomAccess Schemas ----

class UserBrief(BaseModel):
    id: int
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RoleBrief(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class RoomBrief(BaseModel):
    id: int
    name: str
    room_type: str
    building: Optional[str] = None
    floor: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RoomAccessCreate(BaseModel):
    room_id: int
    user_id: Optional[int] = None
    role_id: Optional[int] = None
    access_level: str = "Full Access"
    expires_at: Optional[datetime] = None
    notes: Optional[str] = None


class RoomAccessUpdate(BaseModel):
    access_level: Optional[str] = None
    expires_at: Optional[datetime] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class RoomAccessResponse(BaseModel):
    id: int
    room_id: int
    user_id: Optional[int] = None
    role_id: Optional[int] = None
    access_level: str
    granted_at: datetime
    expires_at: Optional[datetime] = None
    notes: Optional[str] = None
    is_active: bool
    room: Optional[RoomBrief] = None
    user: Optional[UserBrief] = None
    role: Optional[RoleBrief] = None
    granted_by: Optional[UserBrief] = None

    model_config = ConfigDict(from_attributes=True)
