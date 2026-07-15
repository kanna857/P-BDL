from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.department import Department
from app.models.user import User
from app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentResponse
from app.services.auth import PermissionRequirement
from app.services.audit import audit_service

router = APIRouter(prefix="/departments", tags=["Departments"])


@router.get("", response_model=List[DepartmentResponse])
def get_departments(
    current_user: User = Depends(PermissionRequirement(["departments:read"])),
    db: Session = Depends(get_db)
):
    # Retrieve departments with dynamic user count calculation
    results = db.query(
        Department,
        func.count(User.id).label("user_count")
    ).outerjoin(
        User, User.department_id == Department.id
    ).group_by(
        Department.id
    ).all()

    departments = []
    for dept, count in results:
        dept_response = DepartmentResponse.model_validate(dept)
        dept_response.user_count = count
        departments.append(dept_response)

    return departments


@router.post("", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(
    request: Request,
    dept_data: DepartmentCreate,
    current_user: User = Depends(PermissionRequirement(["departments:write"])),
    db: Session = Depends(get_db)
):
    existing = db.query(Department).filter(Department.name == dept_data.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Department already exists."
        )

    db_dept = Department(
        name=dept_data.name,
        description=dept_data.description
    )
    db.add(db_dept)
    db.commit()
    db.refresh(db_dept)

    # Log audit
    ip_address = request.client.host if request.client else None
    audit_service.log_action(
        db=db,
        user_id=current_user.id,
        action="CREATE_DEPARTMENT",
        resource_type="Department",
        resource_id=str(db_dept.id),
        details={"name": db_dept.name},
        ip_address=ip_address
    )

    # Convert to schema response and set count to 0
    resp = DepartmentResponse.model_validate(db_dept)
    resp.user_count = 0
    return resp


@router.put("/{id}", response_model=DepartmentResponse)
def update_department(
    id: int,
    request: Request,
    dept_data: DepartmentUpdate,
    current_user: User = Depends(PermissionRequirement(["departments:write"])),
    db: Session = Depends(get_db)
):
    db_dept = db.query(Department).filter(Department.id == id).first()
    if not db_dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    changes = {}

    if dept_data.name is not None and dept_data.name != db_dept.name:
        existing = db.query(Department).filter(Department.name == dept_data.name).first()
        if existing:
            raise HTTPException(status_code=400, detail="Department name already in use")
        changes["old_name"] = db_dept.name
        changes["new_name"] = dept_data.name
        db_dept.name = dept_data.name

    if dept_data.description is not None:
        db_dept.description = dept_data.description

    db.commit()
    db.refresh(db_dept)

    # Log audit
    ip_address = request.client.host if request.client else None
    audit_service.log_action(
        db=db,
        user_id=current_user.id,
        action="UPDATE_DEPARTMENT",
        resource_type="Department",
        resource_id=str(db_dept.id),
        details=changes,
        ip_address=ip_address
    )

    # Count users
    count = db.query(User).filter(User.department_id == db_dept.id).count()
    resp = DepartmentResponse.model_validate(db_dept)
    resp.user_count = count
    return resp


@router.delete("/{id}")
def delete_department(
    id: int,
    request: Request,
    current_user: User = Depends(PermissionRequirement(["departments:delete"])),
    db: Session = Depends(get_db)
):
    db_dept = db.query(Department).filter(Department.id == id).first()
    if not db_dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    # Set department_id to NULL for all users in this department
    users = db.query(User).filter(User.department_id == id).all()
    for u in users:
        u.department_id = None

    dept_name = db_dept.name
    db.delete(db_dept)
    db.commit()

    # Log audit
    ip_address = request.client.host if request.client else None
    audit_service.log_action(
        db=db,
        user_id=current_user.id,
        action="DELETE_DEPARTMENT",
        resource_type="Department",
        resource_id=str(id),
        details={"deleted_department_name": dept_name},
        ip_address=ip_address
    )

    return {"detail": "Department deleted successfully"}
