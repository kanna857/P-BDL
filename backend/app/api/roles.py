from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.role import Role
from app.models.permission import Permission
from app.models.user import User
from app.schemas.role import RoleCreate, RoleUpdate, RoleResponse
from app.services.auth import PermissionRequirement
from app.services.audit import audit_service

router = APIRouter(prefix="/roles", tags=["Roles"])


@router.get("", response_model=List[RoleResponse])
def get_roles(
    current_user: User = Depends(PermissionRequirement(["roles:read"])),
    db: Session = Depends(get_db)
):
    return db.query(Role).all()


@router.post("", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
def create_role(
    request: Request,
    role_data: RoleCreate,
    current_user: User = Depends(PermissionRequirement(["roles:write"])),
    db: Session = Depends(get_db)
):
    # Check if role name already exists
    existing = db.query(Role).filter(Role.name == role_data.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role with this name already exists."
        )

    db_role = Role(
        name=role_data.name,
        description=role_data.description
    )

    if role_data.permission_ids:
        perms = db.query(Permission).filter(Permission.id.in_(role_data.permission_ids)).all()
        db_role.permissions = perms

    db.add(db_role)
    db.commit()
    db.refresh(db_role)

    # Log audit
    ip_address = request.client.host if request.client else None
    audit_service.log_action(
        db=db,
        user_id=current_user.id,
        action="CREATE_ROLE",
        resource_type="Role",
        resource_id=str(db_role.id),
        details={"name": db_role.name, "permissions": [p.name for p in db_role.permissions]},
        ip_address=ip_address
    )

    return db_role


@router.put("/{id}", response_model=RoleResponse)
def update_role(
    id: int,
    request: Request,
    role_data: RoleUpdate,
    current_user: User = Depends(PermissionRequirement(["roles:write"])),
    db: Session = Depends(get_db)
):
    db_role = db.query(Role).filter(Role.id == id).first()
    if not db_role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    changes = {}

    if role_data.name is not None and role_data.name != db_role.name:
        existing = db.query(Role).filter(Role.name == role_data.name).first()
        if existing:
            raise HTTPException(status_code=400, detail="Role name already in use")
        changes["old_name"] = db_role.name
        changes["new_name"] = role_data.name
        db_role.name = role_data.name

    if role_data.description is not None:
        db_role.description = role_data.description

    if role_data.permission_ids is not None:
        perms = db.query(Permission).filter(Permission.id.in_(role_data.permission_ids)).all()
        changes["old_permissions"] = [p.name for p in db_role.permissions]
        db_role.permissions = perms
        changes["new_permissions"] = [p.name for p in perms]

    db.commit()
    db.refresh(db_role)

    ip_address = request.client.host if request.client else None
    audit_service.log_action(
        db=db,
        user_id=current_user.id,
        action="UPDATE_ROLE",
        resource_type="Role",
        resource_id=str(db_role.id),
        details=changes,
        ip_address=ip_address
    )

    return db_role


@router.delete("/{id}")
def delete_role(
    id: int,
    request: Request,
    current_user: User = Depends(PermissionRequirement(["roles:delete"])),
    db: Session = Depends(get_db)
):
    db_role = db.query(Role).filter(Role.id == id).first()
    if not db_role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    if db_role.name in ["Administrator", "Visitor"]:
        raise HTTPException(status_code=400, detail="Cannot delete core system roles.")

    role_name = db_role.name
    db.delete(db_role)
    db.commit()

    ip_address = request.client.host if request.client else None
    audit_service.log_action(
        db=db,
        user_id=current_user.id,
        action="DELETE_ROLE",
        resource_type="Role",
        resource_id=str(id),
        details={"deleted_role_name": role_name},
        ip_address=ip_address
    )

    return {"detail": "Role deleted successfully"}


@router.post("/assign-permission")
def assign_permission(
    request: Request,
    assignment: dict,
    current_user: User = Depends(PermissionRequirement(["roles:write"])),
    db: Session = Depends(get_db)
):
    # Expects {"role_id": 1, "permission_ids": [1, 2, 3]}
    role_id = assignment.get("role_id")
    permission_ids = assignment.get("permission_ids")

    if not role_id:
        raise HTTPException(status_code=400, detail="role_id is required")
    if permission_ids is None:
        raise HTTPException(status_code=400, detail="permission_ids list is required")

    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    if role.name == "Administrator":
        raise HTTPException(
            status_code=403,
            detail="Modification of Administrator role permissions is locked to protect directory stability."
        )

    perms = db.query(Permission).filter(Permission.id.in_(permission_ids)).all()
    old_perms = [p.name for p in role.permissions]
    role.permissions = perms
    db.commit()

    ip_address = request.client.host if request.client else None
    audit_service.log_action(
        db=db,
        user_id=current_user.id,
        action="ASSIGN_PERMISSIONS",
        resource_type="Role",
        resource_id=str(role_id),
        details={
            "role_name": role.name,
            "old_permissions": old_perms,
            "new_permissions": [p.name for p in perms]
        },
        ip_address=ip_address
    )

    return {"detail": f"Successfully updated permissions for role {role.name}"}
