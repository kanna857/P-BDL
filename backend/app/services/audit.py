from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
from app.models.audit import AuditLog, LoginHistory


class AuditService:
    @staticmethod
    def log_action(
        db: Session,
        user_id: Optional[int],
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None
    ) -> AuditLog:
        db_log = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address
        )
        db.add(db_log)
        db.commit()
        db.refresh(db_log)
        return db_log

    @staticmethod
    def log_login(
        db: Session,
        email: str,
        status: str,
        user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        failure_reason: Optional[str] = None
    ) -> LoginHistory:
        db_history = LoginHistory(
            user_id=user_id,
            email=email,
            ip_address=ip_address,
            user_agent=user_agent,
            status=status,
            failure_reason=failure_reason
        )
        db.add(db_history)
        db.commit()
        db.refresh(db_history)
        return db_history


audit_service = AuditService()
