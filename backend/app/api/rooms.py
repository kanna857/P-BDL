from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func

from app.core.database import get_db
from app.models.room import Room, RoomAccess
from app.models.user import User
from app.models.role import Role
from app.schemas.room import (
    RoomCreate, RoomUpdate, RoomResponse,
    RoomAccessCreate, RoomAccessUpdate, RoomAccessResponse
)
from app.services.auth import PermissionRequirement, get_current_user
from app.services.audit import audit_service

router = APIRouter(prefix="/rooms", tags=["Room Access Control"])

ROOM_TYPES = ["Lab", "Office", "Library", "Conference Room", "Server Room",
              "Cafeteria", "Reception", "Storage", "Other"]
ACCESS_LEVELS = ["Full Access", "Read Only", "Time Restricted", "Escorted Only"]


# ─────────────────────────────────────────
#  Room CRUD Endpoints
# ─────────────────────────────────────────

@router.get("/", response_model=List[RoomResponse])
def list_rooms(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    room_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: User = Depends(PermissionRequirement(["rooms:read"])),
    db: Session = Depends(get_db)
):
    query = db.query(Room)
    if search:
        f = f"%{search}%"
        query = query.filter(
            or_(Room.name.ilike(f), Room.building.ilike(f), Room.location.ilike(f))
        )
    if room_type:
        query = query.filter(Room.room_type == room_type)
    if is_active is not None:
        query = query.filter(Room.is_active == is_active)

    rooms = query.offset(skip).limit(limit).all()

    result = []
    for room in rooms:
        active_count = db.query(func.count(RoomAccess.id)).filter(
            RoomAccess.room_id == room.id, RoomAccess.is_active == True
        ).scalar()
        room_dict = {
            "id": room.id,
            "name": room.name,
            "room_type": room.room_type,
            "location": room.location,
            "floor": room.floor,
            "building": room.building,
            "capacity": room.capacity,
            "description": room.description,
            "requires_escort": room.requires_escort,
            "is_active": room.is_active,
            "created_at": room.created_at,
            "access_count": active_count or 0,
        }
        result.append(RoomResponse(**room_dict))
    return result


@router.get("/types")
def get_room_types(current_user: User = Depends(get_current_user)):
    return {"room_types": ROOM_TYPES, "access_levels": ACCESS_LEVELS}


@router.get("/{room_id}", response_model=RoomResponse)
def get_room(
    room_id: int,
    current_user: User = Depends(PermissionRequirement(["rooms:read"])),
    db: Session = Depends(get_db)
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    active_count = db.query(func.count(RoomAccess.id)).filter(
        RoomAccess.room_id == room.id, RoomAccess.is_active == True
    ).scalar()
    room_dict = {c.name: getattr(room, c.name) for c in room.__table__.columns}
    room_dict["access_count"] = active_count or 0
    return RoomResponse(**room_dict)


@router.post("/", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
def create_room(
    data: RoomCreate,
    current_user: User = Depends(PermissionRequirement(["rooms:write"])),
    db: Session = Depends(get_db)
):
    if db.query(Room).filter(Room.name == data.name).first():
        raise HTTPException(status_code=400, detail="A room with this name already exists")

    room = Room(**data.model_dump())
    db.add(room)
    db.commit()
    db.refresh(room)

    audit_service.log_action(
        db=db, user_id=current_user.id, action="ROOM_CREATED",
        resource_type="Room", resource_id=str(room.id),
        details={"name": room.name, "type": room.room_type}
    )

    room_dict = {c.name: getattr(room, c.name) for c in room.__table__.columns}
    room_dict["access_count"] = 0
    return RoomResponse(**room_dict)


@router.put("/{room_id}", response_model=RoomResponse)
def update_room(
    room_id: int,
    data: RoomUpdate,
    current_user: User = Depends(PermissionRequirement(["rooms:write"])),
    db: Session = Depends(get_db)
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(room, field, value)

    db.commit()
    db.refresh(room)

    audit_service.log_action(
        db=db, user_id=current_user.id, action="ROOM_UPDATED",
        resource_type="Room", resource_id=str(room.id),
        details={"name": room.name, "changes": list(update_data.keys())}
    )

    active_count = db.query(func.count(RoomAccess.id)).filter(
        RoomAccess.room_id == room.id, RoomAccess.is_active == True
    ).scalar()
    room_dict = {c.name: getattr(room, c.name) for c in room.__table__.columns}
    room_dict["access_count"] = active_count or 0
    return RoomResponse(**room_dict)


@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_room(
    room_id: int,
    current_user: User = Depends(PermissionRequirement(["rooms:delete"])),
    db: Session = Depends(get_db)
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    room_name = room.name
    db.delete(room)
    db.commit()

    audit_service.log_action(
        db=db, user_id=current_user.id, action="ROOM_DELETED",
        resource_type="Room", resource_id=str(room_id),
        details={"name": room_name}
    )


# ─────────────────────────────────────────
#  Room Access Grant / Revoke Endpoints
# ─────────────────────────────────────────

@router.get("/{room_id}/access", response_model=List[RoomAccessResponse])
def list_room_access(
    room_id: int,
    current_user: User = Depends(PermissionRequirement(["rooms:read"])),
    db: Session = Depends(get_db)
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    grants = (
        db.query(RoomAccess)
        .options(
            joinedload(RoomAccess.room),
            joinedload(RoomAccess.user),
            joinedload(RoomAccess.role),
            joinedload(RoomAccess.granted_by),
        )
        .filter(RoomAccess.room_id == room_id)
        .all()
    )
    return grants


@router.post("/access/grant", response_model=RoomAccessResponse, status_code=status.HTTP_201_CREATED)
def grant_room_access(
    data: RoomAccessCreate,
    current_user: User = Depends(PermissionRequirement(["rooms:write"])),
    db: Session = Depends(get_db)
):
    if not data.user_id and not data.role_id:
        raise HTTPException(status_code=400, detail="Either user_id or role_id must be provided")

    room = db.query(Room).filter(Room.id == data.room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Check for existing active grant
    existing_query = db.query(RoomAccess).filter(
        RoomAccess.room_id == data.room_id,
        RoomAccess.is_active == True
    )
    if data.user_id:
        existing_query = existing_query.filter(RoomAccess.user_id == data.user_id)
    if data.role_id:
        existing_query = existing_query.filter(RoomAccess.role_id == data.role_id)

    if existing_query.first():
        raise HTTPException(status_code=400, detail="Active access grant already exists for this room")

    grant = RoomAccess(
        room_id=data.room_id,
        user_id=data.user_id,
        role_id=data.role_id,
        access_level=data.access_level,
        expires_at=data.expires_at,
        notes=data.notes,
        granted_by_id=current_user.id,
        is_active=True,
    )
    db.add(grant)
    db.commit()
    db.refresh(grant)

    # Reload with relationships
    grant = (
        db.query(RoomAccess)
        .options(
            joinedload(RoomAccess.room),
            joinedload(RoomAccess.user),
            joinedload(RoomAccess.role),
            joinedload(RoomAccess.granted_by),
        )
        .filter(RoomAccess.id == grant.id)
        .first()
    )

    audit_service.log_action(
        db=db, user_id=current_user.id, action="ROOM_ACCESS_GRANTED",
        resource_type="Room", resource_id=str(data.room_id),
        details={
            "room": room.name,
            "granted_to_user": data.user_id,
            "granted_to_role": data.role_id,
            "access_level": data.access_level
        }
    )

    return grant


@router.put("/access/{access_id}", response_model=RoomAccessResponse)
def update_room_access(
    access_id: int,
    data: RoomAccessUpdate,
    current_user: User = Depends(PermissionRequirement(["rooms:write"])),
    db: Session = Depends(get_db)
):
    grant = db.query(RoomAccess).filter(RoomAccess.id == access_id).first()
    if not grant:
        raise HTTPException(status_code=404, detail="Access grant not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(grant, field, value)

    db.commit()
    db.refresh(grant)

    grant = (
        db.query(RoomAccess)
        .options(
            joinedload(RoomAccess.room),
            joinedload(RoomAccess.user),
            joinedload(RoomAccess.role),
            joinedload(RoomAccess.granted_by),
        )
        .filter(RoomAccess.id == access_id)
        .first()
    )
    return grant


@router.delete("/access/{access_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_room_access(
    access_id: int,
    current_user: User = Depends(PermissionRequirement(["rooms:write"])),
    db: Session = Depends(get_db)
):
    grant = db.query(RoomAccess).filter(RoomAccess.id == access_id).first()
    if not grant:
        raise HTTPException(status_code=404, detail="Access grant not found")

    room_name = grant.room.name if grant.room else str(grant.room_id)
    grant.is_active = False
    db.commit()

    audit_service.log_action(
        db=db, user_id=current_user.id, action="ROOM_ACCESS_REVOKED",
        resource_type="Room", resource_id=str(grant.room_id),
        details={"room": room_name, "access_id": access_id}
    )


@router.get("/access/user/{user_id}", response_model=List[RoomAccessResponse])
def get_user_room_access(
    user_id: int,
    current_user: User = Depends(PermissionRequirement(["rooms:read"])),
    db: Session = Depends(get_db)
):
    """Get all rooms a specific user has access to."""
    grants = (
        db.query(RoomAccess)
        .options(
            joinedload(RoomAccess.room),
            joinedload(RoomAccess.user),
            joinedload(RoomAccess.role),
            joinedload(RoomAccess.granted_by),
        )
        .filter(RoomAccess.user_id == user_id, RoomAccess.is_active == True)
        .all()
    )
    return grants
