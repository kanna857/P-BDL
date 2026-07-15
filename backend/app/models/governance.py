from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class PolicyDocument(Base):
    __tablename__ = "policy_documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False, index=True)
    content = Column(Text, nullable=False)
    category = Column(String(50), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class AccessRequest(Base):
    __tablename__ = "access_requests"

    id = Column(Integer, primary_key=True, index=True)
    requester_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True)
    resource_name = Column(String(100), nullable=True)
    duration_days = Column(Integer, default=1, nullable=False)
    reason = Column(Text, nullable=False)
    risk_score = Column(Float, default=0.0, nullable=False)
    risk_reason = Column(Text, nullable=True)
    status = Column(String(20), default="Pending", nullable=False, index=True)  # "Pending", "Approved", "Rejected"
    manager_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    requester = relationship("User", foreign_keys=[requester_id], backref="access_requests")
    room = relationship("Room")
    manager = relationship("User", foreign_keys=[manager_id])
    risk_scores = relationship("RiskScore", back_populates="request", cascade="all, delete-orphan")


class RiskScore(Base):
    __tablename__ = "risk_scores"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("access_requests.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    overall_score = Column(Float, default=0.0, nullable=False)
    factors = Column(JSON, nullable=True)  # {"role_risk": 0.2, "duration_risk": 0.4, ...}
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    request = relationship("AccessRequest", back_populates="risk_scores")
    user = relationship("User")


class Visitor(Base):
    __tablename__ = "visitors"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    email = Column(String(100), nullable=False, index=True)
    company = Column(String(100), nullable=True)
    host_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    host = relationship("User", foreign_keys=[host_id], backref="hosted_visitors")
    passes = relationship("VisitorPass", back_populates="visitor", cascade="all, delete-orphan")


class VisitorPass(Base):
    __tablename__ = "visitor_passes"

    id = Column(Integer, primary_key=True, index=True)
    visitor_id = Column(Integer, ForeignKey("visitors.id", ondelete="CASCADE"), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True)
    purpose = Column(String(255), nullable=True)
    qr_code_token = Column(String(255), unique=True, index=True, nullable=False)
    starts_at = Column(DateTime(timezone=True), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(20), default="Pending", nullable=False, index=True)  # "Pending", "Approved", "Rejected", "Active", "Expired", "Checked In", "Checked Out"
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    visitor = relationship("Visitor", back_populates="passes")
    room = relationship("Room")
    approvals = relationship("VisitorApproval", back_populates="pass_obj", cascade="all, delete-orphan")


class VisitorApproval(Base):
    __tablename__ = "visitor_approvals"

    id = Column(Integer, primary_key=True, index=True)
    pass_id = Column(Integer, ForeignKey("visitor_passes.id", ondelete="CASCADE"), nullable=False)
    approver_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(20), nullable=False)  # "Approved", "Rejected"
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    pass_obj = relationship("VisitorPass", back_populates="approvals")
    approver = relationship("User")


class HostNotification(Base):
    __tablename__ = "host_notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", backref="host_notifications")


class SecurityAlert(Base):
    __tablename__ = "security_alerts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    alert_type = Column(String(50), nullable=False, index=True)  # "Brute Force", "Anomaly", "Unusual Access Time", etc.
    severity = Column(String(20), default="Medium", nullable=False, index=True)  # "Low", "Medium", "High", "Critical"
    risk_score = Column(Float, default=0.0, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    ip_address = Column(String(45), nullable=True)
    status = Column(String(20), default="Open", nullable=False, index=True)  # "Open", "Investigating", "Resolved"
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User")


class AnomalyScore(Base):
    __tablename__ = "anomaly_scores"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    login_history_id = Column(Integer, ForeignKey("login_history.id", ondelete="CASCADE"), nullable=True)
    audit_log_id = Column(Integer, ForeignKey("audit_logs.id", ondelete="CASCADE"), nullable=True)
    anomaly_score = Column(Float, default=0.0, nullable=False)
    features = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User")


class Policy(Base):
    __tablename__ = "policies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=False, index=True)  # "Security", "Access", "Compliance"
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    versions = relationship("PolicyVersion", back_populates="policy", cascade="all, delete-orphan")


class PolicyVersion(Base):
    __tablename__ = "policy_versions"

    id = Column(Integer, primary_key=True, index=True)
    policy_id = Column(Integer, ForeignKey("policies.id", ondelete="CASCADE"), nullable=False)
    version = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    policy = relationship("Policy", back_populates="versions")
    created_by = relationship("User")


class ComplianceReport(Base):
    __tablename__ = "compliance_reports"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)
    overall_score = Column(Float, default=100.0, nullable=False)
    details = Column(JSON, nullable=True)
    generated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class AccessReview(Base):
    __tablename__ = "access_reviews"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(20), default="Pending", nullable=False, index=True)  # "Pending", "Completed"
    due_date = Column(DateTime(timezone=True), nullable=False)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    reviewer = relationship("User")
