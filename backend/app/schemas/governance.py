from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field


# ─── POLICY DOCUMENTS (RAG) ──────────────────────────────────────────
class PolicyDocumentBase(BaseModel):
    title: str
    content: str
    category: str

class PolicyDocumentCreate(PolicyDocumentBase):
    pass

class PolicyDocumentOut(PolicyDocumentBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── ACCESS REQUESTS ────────────────────────────────────────────────
class AccessRequestBase(BaseModel):
    room_id: Optional[int] = None
    resource_name: Optional[str] = None
    duration_days: int = 1
    reason: str

class AccessRequestCreate(AccessRequestBase):
    pass

class AccessRequestUpdate(BaseModel):
    status: str  # "Approved", "Rejected"
    notes: Optional[str] = None

class AccessRequestOut(BaseModel):
    id: int
    requester_id: int
    requester_email: Optional[str] = None
    requester_name: Optional[str] = None
    room_id: Optional[int] = None
    room_name: Optional[str] = None
    resource_name: Optional[str] = None
    duration_days: int
    reason: str
    risk_score: float
    risk_reason: Optional[str] = None
    status: str
    manager_id: Optional[int] = None
    manager_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── RISK SCORE ──────────────────────────────────────────────────────
class RiskScoreOut(BaseModel):
    id: int
    request_id: int
    user_id: int
    overall_score: float
    factors: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── VISITORS & PASSES ───────────────────────────────────────────────
class VisitorCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    company: Optional[str] = None

class VisitorOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    company: Optional[str] = None
    host_id: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}

class VisitorPassCreate(BaseModel):
    visitor: VisitorCreate
    room_id: Optional[int] = None
    purpose: Optional[str] = None
    starts_at: datetime
    expires_at: datetime

class VisitorPassOut(BaseModel):
    id: int
    visitor_id: int
    visitor: Optional[VisitorOut] = None
    room_id: Optional[int] = None
    room_name: Optional[str] = None
    purpose: Optional[str] = None
    qr_code_token: str
    starts_at: datetime
    expires_at: datetime
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}

class VisitorApprovalCreate(BaseModel):
    status: str  # "Approved", "Rejected"
    notes: Optional[str] = None


# ─── HOST NOTIFICATIONS ──────────────────────────────────────────────
class HostNotificationOut(BaseModel):
    id: int
    user_id: int
    message: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── SECURITY ALERTS ────────────────────────────────────────────────
class SecurityAlertUpdate(BaseModel):
    status: str  # "Open", "Investigating", "Resolved"

class SecurityAlertOut(BaseModel):
    id: int
    title: str
    description: str
    alert_type: str
    severity: str
    risk_score: float
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    ip_address: Optional[str] = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── ANOMALY SCORES ──────────────────────────────────────────────────
class AnomalyScoreOut(BaseModel):
    id: int
    user_id: int
    login_history_id: Optional[int] = None
    audit_log_id: Optional[int] = None
    anomaly_score: float
    features: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── POLICIES ────────────────────────────────────────────────────────
class PolicyVersionCreate(BaseModel):
    content: str

class PolicyVersionOut(BaseModel):
    id: int
    policy_id: int
    version: int
    content: str
    created_by_id: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}

class PolicyCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: str
    content: str  # Initial content for version 1

class PolicyOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    category: str
    is_active: bool
    created_at: datetime
    versions: List[PolicyVersionOut] = []

    model_config = {"from_attributes": True}


# ─── COMPLIANCE & ACCESS REVIEWS ─────────────────────────────────────
class ComplianceReportOut(BaseModel):
    id: int
    title: str
    overall_score: float
    details: Optional[Dict[str, Any]] = None
    generated_at: datetime

    model_config = {"from_attributes": True}

class AccessReviewCreate(BaseModel):
    title: str
    reviewer_id: int
    due_date: datetime
    details: Optional[Dict[str, Any]] = None

class AccessReviewUpdate(BaseModel):
    status: str  # "Pending", "Completed"
    details: Optional[Dict[str, Any]] = None

class AccessReviewOut(BaseModel):
    id: int
    title: str
    reviewer_id: Optional[int] = None
    reviewer_name: Optional[str] = None
    status: str
    due_date: datetime
    details: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── COPILOT CHAT ───────────────────────────────────────────────────
class CopilotChatInput(BaseModel):
    message: str

class CopilotChatOutput(BaseModel):
    response: str
    intent: str
    entities: Dict[str, Any]
    risk_assessment: Dict[str, Any]
    request_created: bool
    request_id: Optional[int] = None
