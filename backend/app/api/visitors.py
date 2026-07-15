import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.room import Room
from app.models.governance import Visitor, VisitorPass, VisitorApproval, HostNotification
from app.schemas.governance import VisitorOut, VisitorPassCreate, VisitorPassOut, VisitorApprovalCreate, HostNotificationOut
from app.services.auth import get_current_user, PermissionRequirement
from app.services.audit import audit_service

router = APIRouter(prefix="/visitors", tags=["Visitor Management"])


@router.get("", response_model=List[VisitorPassOut])
def get_visitor_passes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(VisitorPass).join(Visitor)
    
    # If not Admin or Security Officer, only see visitors hosted by self
    user_role = current_user.role.name if current_user.role else "Visitor"
    if user_role not in ["Administrator", "Security Officer"]:
        query = query.filter(Visitor.host_id == current_user.id)
        
    passes = query.order_by(VisitorPass.created_at.desc()).all()
    
    # Map models to return custom schemas safely
    result = []
    for p in passes:
        vis = VisitorOut(
            id=p.visitor.id,
            first_name=p.visitor.first_name,
            last_name=p.visitor.last_name,
            email=p.visitor.email,
            company=p.visitor.company,
            host_id=p.visitor.host_id,
            created_at=p.visitor.created_at
        )
        result.append(VisitorPassOut(
            id=p.id,
            visitor_id=p.visitor_id,
            visitor=vis,
            room_id=p.room_id,
            room_name=p.room.name if p.room else None,
            purpose=p.purpose,
            qr_code_token=p.qr_code_token,
            starts_at=p.starts_at,
            expires_at=p.expires_at,
            status=p.status,
            created_at=p.created_at
        ))
    return result


@router.post("", response_model=VisitorPassOut)
def register_visitor(
    payload: VisitorPassCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Create Visitor record
    db_visitor = Visitor(
        first_name=payload.visitor.first_name,
        last_name=payload.visitor.last_name,
        email=payload.visitor.email,
        company=payload.visitor.company,
        host_id=current_user.id
    )
    db.add(db_visitor)
    db.commit()
    db.refresh(db_visitor)
    
    # 2. Create Pass with QR Token
    qr_token = f"PASS-{uuid.uuid4().hex[:12].upper()}"
    
    db_pass = VisitorPass(
        visitor_id=db_visitor.id,
        room_id=payload.room_id,
        purpose=payload.purpose,
        qr_code_token=qr_token,
        starts_at=payload.starts_at,
        expires_at=payload.expires_at,
        status="Pending"  # Defaults to Pending manager/host validation
    )
    db.add(db_pass)
    db.commit()
    db.refresh(db_pass)
    
    # Auto-approve if host is Administrator or Manager
    user_role = current_user.role.name if current_user.role else "Visitor"
    if user_role in ["Administrator", "Manager"]:
        db_pass.status = "Active"
        db.commit()
        
        # Log approval
        approval = VisitorApproval(
            pass_id=db_pass.id,
            approver_id=current_user.id,
            status="Approved",
            notes="Auto-approved based on Host authority level."
        )
        db.add(approval)
        db.commit()
        
    # Audit log
    audit_service.log_action(
        db=db,
        user_id=current_user.id,
        action="REGISTER_VISITOR",
        resource_type="Visitor",
        resource_id=str(db_visitor.id),
        details={"pass_id": db_pass.id, "qr_token": qr_token}
    )
    
    vis_out = VisitorOut(
        id=db_visitor.id,
        first_name=db_visitor.first_name,
        last_name=db_visitor.last_name,
        email=db_visitor.email,
        company=db_visitor.company,
        host_id=db_visitor.host_id,
        created_at=db_visitor.created_at
    )
    
    return VisitorPassOut(
        id=db_pass.id,
        visitor_id=db_pass.visitor_id,
        visitor=vis_out,
        room_id=db_pass.room_id,
        room_name=db_pass.room.name if db_pass.room else None,
        purpose=db_pass.purpose,
        qr_code_token=db_pass.qr_code_token,
        starts_at=db_pass.starts_at,
        expires_at=db_pass.expires_at,
        status=db_pass.status,
        created_at=db_pass.created_at
    )


@router.get("/{id}/pass", response_model=VisitorPassOut)
def get_visitor_pass(
    id: int,
    db: Session = Depends(get_db)
):
    p = db.query(VisitorPass).filter(VisitorPass.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Visitor pass not found")
        
    vis_out = VisitorOut(
        id=p.visitor.id,
        first_name=p.visitor.first_name,
        last_name=p.visitor.last_name,
        email=p.visitor.email,
        company=p.visitor.company,
        host_id=p.visitor.host_id,
        created_at=p.visitor.created_at
    )
    return VisitorPassOut(
        id=p.id,
        visitor_id=p.visitor_id,
        visitor=vis_out,
        room_id=p.room_id,
        room_name=p.room.name if p.room else None,
        purpose=p.purpose,
        qr_code_token=p.qr_code_token,
        starts_at=p.starts_at,
        expires_at=p.expires_at,
        status=p.status,
        created_at=p.created_at
    )


@router.post("/{id}/approve", response_model=VisitorPassOut)
def approve_visitor_pass(
    id: int,
    payload: VisitorApprovalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    p = db.query(VisitorPass).filter(VisitorPass.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Visitor pass not found")
        
    p.status = "Active" if payload.status == "Approved" else "Rejected"
    
    approval = VisitorApproval(
        pass_id=p.id,
        approver_id=current_user.id,
        status=payload.status,
        notes=payload.notes
    )
    db.add(approval)
    db.commit()
    
    # Notify host
    notification = HostNotification(
        user_id=p.visitor.host_id,
        message=f"Visitor approval update: Pass for visitor {p.visitor.first_name} {p.visitor.last_name} has been {payload.status.lower()} by {current_user.first_name}."
    )
    db.add(notification)
    db.commit()
    
    # Audit log
    audit_service.log_action(
        db=db,
        user_id=current_user.id,
        action=f"VISITOR_PASS_{payload.status.upper()}",
        resource_type="VisitorPass",
        resource_id=str(p.id),
        details={"status": payload.status}
    )
    
    vis_out = VisitorOut(
        id=p.visitor.id,
        first_name=p.visitor.first_name,
        last_name=p.visitor.last_name,
        email=p.visitor.email,
        company=p.visitor.company,
        host_id=p.visitor.host_id,
        created_at=p.visitor.created_at
    )
    
    return VisitorPassOut(
        id=p.id,
        visitor_id=p.visitor_id,
        visitor=vis_out,
        room_id=p.room_id,
        room_name=p.room.name if p.room else None,
        purpose=p.purpose,
        qr_code_token=p.qr_code_token,
        starts_at=p.starts_at,
        expires_at=p.expires_at,
        status=p.status,
        created_at=p.created_at
    )


@router.post("/{id}/checkin", response_model=VisitorPassOut)
def checkin_visitor(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    p = db.query(VisitorPass).filter(VisitorPass.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Visitor pass not found")
        
    # Simple checkin state machine: Active -> Checked In -> Checked Out
    if p.status == "Active":
        p.status = "Checked In"
        msg = f"Your visitor {p.visitor.first_name} {p.visitor.last_name} has checked in."
    elif p.status == "Checked In":
        p.status = "Checked Out"
        msg = f"Your visitor {p.visitor.first_name} {p.visitor.last_name} has checked out."
    else:
        raise HTTPException(status_code=400, detail=f"Cannot check in/out from pass status: {p.status}")
        
    db.commit()
    
    # Notify host
    if p.visitor.host_id:
        notification = HostNotification(
            user_id=p.visitor.host_id,
            message=msg
        )
        db.add(notification)
        db.commit()
        
    # Audit log
    audit_service.log_action(
        db=db,
        user_id=current_user.id,
        action=f"VISITOR_{p.status.replace(' ', '_').upper()}",
        resource_type="VisitorPass",
        resource_id=str(p.id)
    )
    
    vis_out = VisitorOut(
        id=p.visitor.id,
        first_name=p.visitor.first_name,
        last_name=p.visitor.last_name,
        email=p.visitor.email,
        company=p.visitor.company,
        host_id=p.visitor.host_id,
        created_at=p.visitor.created_at
    )
    
    return VisitorPassOut(
        id=p.id,
        visitor_id=p.visitor_id,
        visitor=vis_out,
        room_id=p.room_id,
        room_name=p.room.name if p.room else None,
        purpose=p.purpose,
        qr_code_token=p.qr_code_token,
        starts_at=p.starts_at,
        expires_at=p.expires_at,
        status=p.status,
        created_at=p.created_at
    )


@router.get("/notifications", response_model=List[HostNotificationOut])
def get_host_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notifications = db.query(HostNotification).filter(
        HostNotification.user_id == current_user.id
    ).order_by(HostNotification.created_at.desc()).all()
    return notifications


@router.post("/notifications/read")
def mark_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.query(HostNotification).filter(
        HostNotification.user_id == current_user.id,
        HostNotification.is_read == False
    ).update({HostNotification.is_read: True})
    db.commit()
    return {"message": "Notifications marked as read"}
