from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.permission import Permission
from app.models.user import User
from app.schemas.permission import PermissionCreate, PermissionResponse
from app.services.auth import PermissionRequirement
from app.services.audit import audit_service

router = APIRouter(prefix="/permissions", tags=["Permissions"])


@router.get("", response_model=List[PermissionResponse])
def get_permissions(
    module: Optional[str] = None,
    current_user: User = Depends(PermissionRequirement(["permissions:read"])),
    db: Session = Depends(get_db)
):
    query = db.query(Permission)
    if module:
        query = query.filter(Permission.module == module)
    return query.all()


@router.post("", response_model=PermissionResponse, status_code=status.HTTP_201_CREATED)
def create_permission(
    request: Request,
    permission_data: PermissionCreate,
    current_user: User = Depends(PermissionRequirement(["permissions:write"])),
    db: Session = Depends(get_db)
):
    existing = db.query(Permission).filter(Permission.name == permission_data.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Permission already exists."
        )

    db_permission = Permission(
        name=permission_data.name,
        description=permission_data.description,
        module=permission_data.module
    )
    db.add(db_permission)
    db.commit()
    db.refresh(db_permission)

    # Log audit
    ip_address = request.client.host if request.client else None
    audit_service.log_action(
        db=db,
        user_id=current_user.id,
        action="CREATE_PERMISSION",
        resource_type="Permission",
        resource_id=str(db_permission.id),
        details={"name": db_permission.name, "module": db_permission.module},
        ip_address=ip_address
    )

    return db_permission


@router.delete("/{id}")
def delete_permission(
    id: int,
    request: Request,
    current_user: User = Depends(PermissionRequirement(["permissions:delete"])),
    db: Session = Depends(get_db)
):
    db_permission = db.query(Permission).filter(Permission.id == id).first()
    if not db_permission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Permission not found")

    permission_name = db_permission.name
    db.delete(db_permission)
    db.commit()

    ip_address = request.client.host if request.client else None
    audit_service.log_action(
        db=db,
        user_id=current_user.id,
        action="DELETE_PERMISSION",
        resource_type="Permission",
        resource_id=str(id),
        details={"deleted_permission_name": permission_name},
        ip_address=ip_address
    )

    return {"detail": "Permission deleted successfully"}
