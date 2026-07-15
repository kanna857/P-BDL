from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.governance import SecurityAlert, AnomalyScore
from app.schemas.governance import SecurityAlertOut, SecurityAlertUpdate, AnomalyScoreOut
from app.services.auth import PermissionRequirement, get_current_user
from app.services.audit import audit_service
from app.services.security_ml import train_and_detect_anomalies

router = APIRouter(prefix="/security", tags=["Security Anomaly Monitoring"])


@router.get("/alerts", response_model=List[SecurityAlertOut])
def get_security_alerts(
    current_user: User = Depends(PermissionRequirement(["audit:read"])),
    db: Session = Depends(get_db)
):
    alerts = db.query(SecurityAlert).order_by(SecurityAlert.created_at.desc()).all()
    
    # Map to schema safely
    result = []
    for a in alerts:
        email = a.user.email if a.user else "System/External"
        result.append(SecurityAlertOut(
            id=a.id,
            title=a.title,
            description=a.description,
            alert_type=a.alert_type,
            severity=a.severity,
            risk_score=a.risk_score,
            user_id=a.user_id,
            user_email=email,
            ip_address=a.ip_address,
            status=a.status,
            created_at=a.created_at
        ))
    return result


@router.put("/alerts/{id}", response_model=SecurityAlertOut)
def update_security_alert(
    id: int,
    payload: SecurityAlertUpdate,
    current_user: User = Depends(PermissionRequirement(["audit:read"])),
    db: Session = Depends(get_db)
):
    alert = db.query(SecurityAlert).filter(SecurityAlert.id == id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Security alert not found")
        
    alert.status = payload.status
    db.commit()
    
    # Log audit
    audit_service.log_action(
        db=db,
        user_id=current_user.id,
        action="UPDATE_SECURITY_ALERT_STATUS",
        resource_type="SecurityAlert",
        resource_id=str(alert.id),
        details={"status": payload.status}
    )
    
    email = alert.user.email if alert.user else "System/External"
    return SecurityAlertOut(
        id=alert.id,
        title=alert.title,
        description=alert.description,
        alert_type=alert.alert_type,
        severity=alert.severity,
        risk_score=alert.risk_score,
        user_id=alert.user_id,
        user_email=email,
        ip_address=alert.ip_address,
        status=alert.status,
        created_at=alert.created_at
    )


@router.get("/scores", response_model=List[AnomalyScoreOut])
def get_anomaly_scores(
    current_user: User = Depends(PermissionRequirement(["audit:read"])),
    db: Session = Depends(get_db)
):
    scores = db.query(AnomalyScore).order_by(AnomalyScore.created_at.desc()).limit(100).all()
    return scores


@router.post("/train")
def retrain_security_models(
    current_user: User = Depends(PermissionRequirement(["audit:read"])),
    db: Session = Depends(get_db)
):
    # Log retraining action
    audit_service.log_action(
        db=db,
        user_id=current_user.id,
        action="RETRAIN_ANOMALY_MODELS",
        resource_type="SecurityModel",
        details={"triggered_by": current_user.email}
    )
    
    result = train_and_detect_anomalies(db)
    return result
