from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc, func
from app.core.database import get_db
from app.models.audit import AuditLog, LoginHistory
from app.models.user import User, UserSession
from app.models.role import Role
from app.models.department import Department
from app.schemas.audit import AuditLogResponse, LoginHistoryResponse
from app.services.auth import PermissionRequirement, get_current_user, AuthService

router = APIRouter(prefix="/audit", tags=["Governance & Audit"])


@router.get("/logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(PermissionRequirement(["audit:read"])),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog).options(joinedload(AuditLog.user))

    if action:
        query = query.filter(AuditLog.action == action)

    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)

    if search:
        search_filter = f"%{search}%"
        query = query.outerjoin(User, AuditLog.user_id == User.id).filter(
            or_(
                AuditLog.action.ilike(search_filter),
                AuditLog.resource_type.ilike(search_filter),
                AuditLog.ip_address.ilike(search_filter),
                User.email.ilike(search_filter),
                User.first_name.ilike(search_filter),
                User.last_name.ilike(search_filter)
            )
        )

    logs = query.order_by(desc(AuditLog.timestamp)).offset(skip).limit(limit).all()
    return logs


@router.get("/login-history", response_model=List[LoginHistoryResponse])
def get_login_history(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    current_user: User = Depends(PermissionRequirement(["login_history:read"])),
    db: Session = Depends(get_db)
):
    query = db.query(LoginHistory).options(joinedload(LoginHistory.user))

    if status_filter:
        query = query.filter(LoginHistory.status == status_filter)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                LoginHistory.email.ilike(search_filter),
                LoginHistory.ip_address.ilike(search_filter),
                LoginHistory.failure_reason.ilike(search_filter)
            )
        )

    histories = query.order_by(desc(LoginHistory.timestamp)).offset(skip).limit(limit).all()
    return histories


@router.get("/stats")
def get_governance_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    perms = AuthService.get_user_permissions(current_user)

    if not ("users:read" in perms or "*" in perms or "audit:read" in perms):
        raise HTTPException(status_code=403, detail="Not authorized to fetch workspace stats.")

    total_users = db.query(func.count(User.id)).scalar()
    total_roles = db.query(func.count(Role.id)).scalar()
    total_departments = db.query(func.count(Department.id)).scalar()
    active_sessions = db.query(func.count(UserSession.id)).scalar()

    failed_logins_24h = db.query(func.count(LoginHistory.id)).filter(
        LoginHistory.status == "Failed",
        LoginHistory.timestamp >= datetime.now(timezone.utc) - timedelta(days=1)
    ).scalar()

    return {
        "total_users": total_users,
        "total_roles": total_roles,
        "total_departments": total_departments,
        "active_sessions": active_sessions,
        "failed_logins_24h": failed_logins_24h
    }
