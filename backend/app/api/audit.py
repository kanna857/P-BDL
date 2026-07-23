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
from app.models.governance import AccessRequest, VisitorPass, SecurityAlert, Policy
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

    now = datetime.now(timezone.utc)

    # Core counts
    total_users = db.query(func.count(User.id)).scalar()
    total_roles = db.query(func.count(Role.id)).scalar()
    total_departments = db.query(func.count(Department.id)).scalar()
    active_sessions = db.query(func.count(UserSession.id)).scalar()

    # Failed logins in last 24 hours
    failed_logins_24h = db.query(func.count(LoginHistory.id)).filter(
        LoginHistory.status == "Failed",
        LoginHistory.timestamp >= now - timedelta(hours=24)
    ).scalar()

    # Pending access requests
    pending_access_requests = 0
    expiring_visitor_passes = 0
    open_security_alerts = 0
    active_policies = 0

    try:
        pending_access_requests = db.query(func.count(AccessRequest.id)).filter(
            AccessRequest.status == "Pending"
        ).scalar() or 0

        # Visitor passes expiring within 24 hours
        # Use naive datetime for SQLite compatibility
        now_naive = datetime.utcnow()
        expiring_visitor_passes = db.query(func.count(VisitorPass.id)).filter(
            VisitorPass.expires_at <= now_naive + timedelta(hours=24),
            VisitorPass.expires_at >= now_naive,
            VisitorPass.status.in_(["Active", "Approved", "Pending"])
        ).scalar() or 0

        # Open security alerts
        open_security_alerts = db.query(func.count(SecurityAlert.id)).filter(
            SecurityAlert.status.in_(["Open", "Investigating"])
        ).scalar() or 0

        # Active policies count
        active_policies = db.query(func.count(Policy.id)).filter(
            Policy.is_active == True
        ).scalar() or 0

    except Exception as e:
        import logging
        logging.warning(f"Governance stats query failed: {e}")

    return {
        "total_users": total_users,
        "total_roles": total_roles,
        "total_departments": total_departments,
        "active_sessions": active_sessions,
        "failed_logins_24h": failed_logins_24h,
        "pending_access_requests": pending_access_requests,
        "expiring_visitor_passes": expiring_visitor_passes,
        "open_security_alerts": open_security_alerts,
        "active_policies": active_policies,
    }
