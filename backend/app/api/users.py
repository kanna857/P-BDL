from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from app.core.database import get_db
from app.core.security import get_password_hash
from app.models.user import User
from app.models.role import Role
from app.models.department import Department
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.services.auth import PermissionRequirement, get_current_user
from app.services.audit import audit_service

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=List[UserResponse])
def get_users(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    department_id: Optional[int] = None,
    role_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    current_user: User = Depends(PermissionRequirement(["users:read"])),
    db: Session = Depends(get_db)
):
    query = db.query(User)
    
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                User.email.ilike(search_filter),
                User.first_name.ilike(search_filter),
                User.last_name.ilike(search_filter)
            )
        )
        
    if department_id is not None:
        query = query.filter(User.department_id == department_id)
        
    if role_id is not None:
        query = query.filter(User.role_id == role_id)
        
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
        
    users = query.offset(skip).limit(limit).all()
    return users


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    request: Request,
    user_data: UserCreate,
    current_user: User = Depends(PermissionRequirement(["users:write"])),
    db: Session = Depends(get_db)
):
    # Check email exists
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address already registered."
        )

    # Validate department and role if provided
    if user_data.department_id and user_data.department_id != 0:
        dept = db.query(Department).filter(Department.id == user_data.department_id).first()
        if not dept:
            raise HTTPException(status_code=400, detail="Invalid department ID")
            
    if user_data.role_id and user_data.role_id != 0:
        role = db.query(Role).filter(Role.id == user_data.role_id).first()
        if not role:
            raise HTTPException(status_code=400, detail="Invalid role ID")

    # Hash password and create
    db_user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        is_active=user_data.is_active,
        department_id=user_data.department_id if user_data.department_id != 0 else None,
        role_id=user_data.role_id if user_data.role_id != 0 else None
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Log audit trail
    ip_address = request.client.host if request.client else None
    audit_service.log_action(
        db=db,
        user_id=current_user.id,
        action="CREATE_USER",
        resource_type="User",
        resource_id=str(db_user.id),
        details={"email": db_user.email, "role_id": db_user.role_id, "department_id": db_user.department_id},
        ip_address=ip_address
    )

    return db_user


@router.put("/{id}", response_model=UserResponse)
def update_user(
    id: int,
    request: Request,
    user_data: UserUpdate,
    current_user: User = Depends(PermissionRequirement(["users:write"])),
    db: Session = Depends(get_db)
):
    db_user = db.query(User).filter(User.id == id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    changes = {}
    
    # Update text fields
    if user_data.email is not None and user_data.email != db_user.email:
        # Check email conflict
        email_check = db.query(User).filter(User.email == user_data.email).first()
        if email_check:
            raise HTTPException(status_code=400, detail="Email already in use")
        changes["old_email"] = db_user.email
        changes["new_email"] = user_data.email
        db_user.email = user_data.email

    if user_data.password:
        db_user.password_hash = get_password_hash(user_data.password)
        changes["password_updated"] = True

    if user_data.first_name is not None:
        db_user.first_name = user_data.first_name
    if user_data.last_name is not None:
        db_user.last_name = user_data.last_name

    if user_data.is_active is not None and user_data.is_active != db_user.is_active:
        changes["old_status"] = db_user.is_active
        changes["new_status"] = user_data.is_active
        db_user.is_active = user_data.is_active

    if user_data.department_id is not None and user_data.department_id != db_user.department_id:
        if user_data.department_id != 0:
            dept = db.query(Department).filter(Department.id == user_data.department_id).first()
            if not dept:
                raise HTTPException(status_code=400, detail="Invalid department ID")
            db_user.department_id = user_data.department_id
        else:
            db_user.department_id = None
        changes["department_id"] = db_user.department_id

    if user_data.role_id is not None and user_data.role_id != db_user.role_id:
        if user_data.role_id != 0:
            role = db.query(Role).filter(Role.id == user_data.role_id).first()
            if not role:
                raise HTTPException(status_code=400, detail="Invalid role ID")
            db_user.role_id = user_data.role_id
        else:
            db_user.role_id = None
        changes["role_id"] = db_user.role_id

    db.commit()
    db.refresh(db_user)

    ip_address = request.client.host if request.client else None
    audit_service.log_action(
        db=db,
        user_id=current_user.id,
        action="UPDATE_USER",
        resource_type="User",
        resource_id=str(db_user.id),
        details=changes,
        ip_address=ip_address
    )

    return db_user


@router.delete("/{id}")
def delete_user(
    id: int,
    request: Request,
    current_user: User = Depends(PermissionRequirement(["users:delete"])),
    db: Session = Depends(get_db)
):
    db_user = db.query(User).filter(User.id == id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if db_user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own account.")

    # Get details before deleting
    email = db_user.email
    db.delete(db_user)
    db.commit()

    ip_address = request.client.host if request.client else None
    audit_service.log_action(
        db=db,
        user_id=current_user.id,
        action="DELETE_USER",
        resource_type="User",
        resource_id=str(id),
        details={"deleted_user_email": email},
        ip_address=ip_address
    )

    return {"detail": "User deleted successfully"}


@router.post("/assign-role")
def assign_role(
    request: Request,
    assignment: dict,
    current_user: User = Depends(PermissionRequirement(["users:write"])),
    db: Session = Depends(get_db)
):
    user_id = assignment.get("user_id")
    role_id = assignment.get("role_id")

    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 1. Fetch target role (if any)
    target_role = None
    if role_id is not None and role_id != 0:
        target_role = db.query(Role).filter(Role.id == role_id).first()
        if not target_role:
            raise HTTPException(status_code=400, detail="Invalid role ID")

    # 2. Extract current roles info
    current_user_role = current_user.role.name if current_user.role else "None"
    target_user_current_role = user.role.name if user.role else "None"

    # 3. Guard against privilege escalation
    if target_role and target_role.name == "Administrator" and current_user_role != "Administrator":
        raise HTTPException(
            status_code=403,
            detail="Only Administrators can assign the Administrator role."
        )

    if target_user_current_role == "Administrator" and current_user_role != "Administrator":
        raise HTTPException(
            status_code=403,
            detail="Only Administrators can change or demote an existing Administrator."
        )

    # 4. Assign role
    if target_role:
        user.role_id = role_id
        role_name = target_role.name
    else:
        user.role_id = None
        role_name = "None"

    db.commit()

    ip_address = request.client.host if request.client else None
    audit_service.log_action(
        db=db,
        user_id=current_user.id,
        action="ASSIGN_ROLE",
        resource_type="User",
        resource_id=str(user_id),
        details={"assigned_role_name": role_name, "role_id": role_id},
        ip_address=ip_address
    )

    return {"detail": f"Successfully assigned role {role_name} to user {user.email}"}
