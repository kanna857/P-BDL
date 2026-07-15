from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.models.user import User
from app.models.role import Role
from app.models.room import Room, RoomAccess
from app.models.governance import AccessRequest, RiskScore
from app.schemas.governance import CopilotChatInput, CopilotChatOutput, AccessRequestOut, AccessRequestUpdate
from app.services.auth import get_current_user, PermissionRequirement
from app.services.audit import audit_service
from app.services.rag import extract_entities_from_text, run_policy_rag, calculate_risk_score

router = APIRouter(tags=["AI Copilot & Access Requests"])


@router.post("/copilot/chat", response_model=CopilotChatOutput)
def copilot_chat(
    payload: CopilotChatInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = payload.message
    
    # 1. Extract entities
    entities = extract_entities_from_text(query, db)
    
    # 2. Run policy retrieval (RAG)
    rag_result = run_policy_rag(query, db)
    
    # 3. Calculate Risk Score
    user_role_name = current_user.role.name if current_user.role else "Visitor"
    risk_info = calculate_risk_score(
        user_role=user_role_name,
        room=entities["room"],
        duration_days=entities["duration_days"],
        user_id=current_user.id,
        db=db
    )
    
    # 4. Determine recommendation
    risk_score = risk_info["overall_score"]
    recommendation = "Reject" if risk_score > 0.7 else "Approve"
    
    # 5. Create Access Request automatically
    # Look for a manager in the department, or fallback to any manager
    manager = None
    if current_user.department_id:
        manager = db.query(User).join(Role).filter(
            User.department_id == current_user.department_id,
            Role.name == "Manager"
        ).first()
    
    if not manager:
        manager = db.query(User).join(Role).filter(Role.name == "Manager").first()
        
    db_request = AccessRequest(
        requester_id=current_user.id,
        room_id=entities["room_id"],
        resource_name=entities["resource_name"],
        duration_days=entities["duration_days"],
        reason=entities["reason"],
        risk_score=risk_score,
        risk_reason=risk_info["risk_reason"],
        status="Pending",
        manager_id=manager.id if manager else None
    )
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    
    # Create RiskScore details record
    db_risk = RiskScore(
        request_id=db_request.id,
        user_id=current_user.id,
        overall_score=risk_score,
        factors=risk_info["factors"]
    )
    db.add(db_risk)
    db.commit()
    
    # Audit log
    audit_service.log_action(
        db=db,
        user_id=current_user.id,
        action="CREATE_ACCESS_REQUEST_VIA_COPILOT",
        resource_type="AccessRequest",
        resource_id=str(db_request.id),
        details={
            "resource": db_request.resource_name,
            "duration": db_request.duration_days,
            "risk_score": risk_score,
            "recommendation": recommendation
        }
    )
    
    # Build complete copilot response output
    risk_text = f"\n\n🚨 **AI Risk Assessment**: {risk_score * 100}% Risk Score ({risk_info['risk_reason']})."
    rec_text = f"\n💡 **AI Recommendation**: **{recommendation}**."
    chat_response = (
        f"{rag_result['llm_response']}"
        f"{risk_text}"
        f"{rec_text}"
        f"\n\n✅ **System Action**: Access request `#{db_request.id}` has been created for resource **{db_request.resource_name}** ({db_request.duration_days} days) and routed to Manager review."
    )
    
    return CopilotChatOutput(
        response=chat_response,
        intent="Request Access",
        entities={
            "resource": entities["resource_name"],
            "duration_days": entities["duration_days"],
            "reason": entities["reason"]
        },
        risk_assessment={
            "score": risk_score,
            "reason": risk_info["risk_reason"],
            "factors": risk_info["factors"]
        },
        request_created=True,
        request_id=db_request.id
    )


@router.get("/access-requests", response_model=List[AccessRequestOut])
def get_access_requests(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(AccessRequest)
    
    # Filters based on Role
    user_role = current_user.role.name if current_user.role else "Visitor"
    
    if user_role == "Manager":
        # Managers see requests routed to them OR requests in their department
        query = query.filter(
            or_(
                AccessRequest.manager_id == current_user.id,
                AccessRequest.requester.has(User.department_id == current_user.department_id)
            )
        )
    elif user_role not in ["Administrator", "Security Officer"]:
        # Standard users see only their own requests
        query = query.filter(AccessRequest.requester_id == current_user.id)
        
    if status:
        query = query.filter(AccessRequest.status.ilike(status))
        
    requests = query.order_by(AccessRequest.created_at.desc()).all()
    
    # Construct schema outputs manually to support relationship labels safely
    result = []
    for req in requests:
        req_name = f"{req.requester.first_name} {req.requester.last_name}" if req.requester else "Unknown"
        mgr_name = f"{req.manager.first_name} {req.manager.last_name}" if req.manager else "N/A"
        room_name = req.room.name if req.room else None
        
        result.append(AccessRequestOut(
            id=req.id,
            requester_id=req.requester_id,
            requester_email=req.requester.email if req.requester else None,
            requester_name=req_name,
            room_id=req.room_id,
            room_name=room_name,
            resource_name=req.resource_name,
            duration_days=req.duration_days,
            reason=req.reason,
            risk_score=req.risk_score,
            risk_reason=req.risk_reason,
            status=req.status,
            manager_id=req.manager_id,
            manager_name=mgr_name,
            reviewed_at=req.reviewed_at,
            created_at=req.created_at
        ))
    return result


@router.put("/access-requests/{id}/approve", response_model=AccessRequestOut)
def review_access_request(
    id: int,
    payload: AccessRequestUpdate,
    current_user: User = Depends(PermissionRequirement(["rooms:write"])),
    db: Session = Depends(get_db)
):
    req = db.query(AccessRequest).filter(AccessRequest.id == id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Access request not found")
        
    if req.status != "Pending":
        raise HTTPException(status_code=400, detail="Request has already been processed")
        
    req.status = payload.status
    req.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    
    # If approved, grant access in RoomAccess!
    if req.status == "Approved" and req.room_id:
        # Check if active access grant already exists
        exists = db.query(RoomAccess).filter(
            RoomAccess.room_id == req.room_id,
            RoomAccess.user_id == req.requester_id,
            RoomAccess.is_active == True
        ).first()
        
        if not exists:
            # Grant access for the duration
            expiry = datetime.now(timezone.utc) + timedelta(days=req.duration_days)
            new_grant = RoomAccess(
                room_id=req.room_id,
                user_id=req.requester_id,
                access_level="Full Access",
                granted_by_id=current_user.id,
                expires_at=expiry,
                notes=f"Approved access request via AI Copilot. Request ID: {req.id}. Reason: {req.reason}",
                is_active=True
            )
            db.add(new_grant)
            db.commit()
            
    # Audit log
    audit_service.log_action(
        db=db,
        user_id=current_user.id,
        action=f"REVIEW_ACCESS_REQUEST_{payload.status.upper()}",
        resource_type="AccessRequest",
        resource_id=str(req.id),
        details={"status": payload.status, "notes": payload.notes}
    )
    
    req_name = f"{req.requester.first_name} {req.requester.last_name}" if req.requester else "Unknown"
    mgr_name = f"{req.manager.first_name} {req.manager.last_name}" if req.manager else "N/A"
    
    return AccessRequestOut(
        id=req.id,
        requester_id=req.requester_id,
        requester_email=req.requester.email if req.requester else None,
        requester_name=req_name,
        room_id=req.room_id,
        room_name=req.room.name if req.room else None,
        resource_name=req.resource_name,
        duration_days=req.duration_days,
        reason=req.reason,
        risk_score=req.risk_score,
        risk_reason=req.risk_reason,
        status=req.status,
        manager_id=req.manager_id,
        manager_name=mgr_name,
        reviewed_at=req.reviewed_at,
        created_at=req.created_at
    )
