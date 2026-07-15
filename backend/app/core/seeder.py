from sqlalchemy.orm import Session
from app.core.database import Base, engine
from app.core.security import get_password_hash
from app.core.config import settings
from app.models import (
    Department, Permission, Role, User, Room, RoomAccess,
    PolicyDocument, Policy, PolicyVersion, LoginHistory, AuditLog,
    Visitor, VisitorPass, AccessReview, ComplianceReport, AccessRequest
)
import random
from datetime import datetime, timedelta, timezone


def seed_database(db: Session):
    Base.metadata.create_all(bind=engine)

    # ── 1. Departments ───────────────────────────────────────────────
    departments_data = [
        {"name": "Engineering", "description": "Software development and infrastructure"},
        {"name": "Security Operations", "description": "Cybersecurity and compliance"},
        {"name": "Human Resources", "description": "Talent and employee relations"},
        {"name": "Executive Office", "description": "Strategic leadership"},
    ]
    departments = {}
    for dept in departments_data:
        obj = db.query(Department).filter(Department.name == dept["name"]).first()
        if not obj:
            obj = Department(**dept)
            db.add(obj)
            db.commit()
            db.refresh(obj)
        departments[dept["name"]] = obj

    # ── 2. Permissions ───────────────────────────────────────────────
    permissions_data = [
        {"name": "users:read",          "description": "Read users list and details",              "module": "users"},
        {"name": "users:write",         "description": "Create and update users",                  "module": "users"},
        {"name": "users:delete",        "description": "Delete user accounts",                     "module": "users"},
        {"name": "roles:read",          "description": "Read roles list and privileges",            "module": "roles"},
        {"name": "roles:write",         "description": "Create and modify roles",                  "module": "roles"},
        {"name": "roles:delete",        "description": "Delete role definitions",                  "module": "roles"},
        {"name": "permissions:read",    "description": "Read system permissions list",             "module": "permissions"},
        {"name": "permissions:write",   "description": "Create and modify custom permissions",     "module": "permissions"},
        {"name": "permissions:delete",  "description": "Delete custom permissions",                "module": "permissions"},
        {"name": "departments:read",    "description": "Read department list",                     "module": "departments"},
        {"name": "departments:write",   "description": "Create and modify departments",            "module": "departments"},
        {"name": "departments:delete",  "description": "Delete department records",                "module": "departments"},
        {"name": "audit:read",          "description": "View system compliance audit logs",        "module": "audit"},
        {"name": "login_history:read",  "description": "View users login logs",                   "module": "login_history"},
        {"name": "rooms:read",          "description": "View rooms and access grants",             "module": "rooms"},
        {"name": "rooms:write",         "description": "Create rooms and grant/revoke access",    "module": "rooms"},
        {"name": "rooms:delete",        "description": "Delete room records",                     "module": "rooms"},
    ]
    permissions = {}
    for perm in permissions_data:
        obj = db.query(Permission).filter(Permission.name == perm["name"]).first()
        if not obj:
            obj = Permission(**perm)
            db.add(obj)
            db.commit()
            db.refresh(obj)
        permissions[perm["name"]] = obj

    # ── 3. Roles ─────────────────────────────────────────────────────
    roles_data = [
        {
            "name": "Administrator",
            "description": "Full access to all modules",
            "perms": list(permissions.keys()),
        },
        {
            "name": "Manager",
            "description": "Manage users and view governance logs",
            "perms": [
                "users:read", "users:write", "roles:read", "permissions:read",
                "departments:read", "audit:read", "login_history:read",
                "rooms:read", "rooms:write",
            ],
        },
        {
            "name": "Engineer",
            "description": "Standard engineering access",
            "perms": ["users:read", "departments:read", "rooms:read"],
        },
        {
            "name": "Intern",
            "description": "Limited read-only access",
            "perms": ["users:read", "departments:read", "rooms:read"],
        },
        {
            "name": "Security Officer",
            "description": "Compliance auditor focusing on logs",
            "perms": ["users:read", "audit:read", "login_history:read", "rooms:read", "rooms:write"],
        },
        {
            "name": "Visitor",
            "description": "Basic authenticated access",
            "perms": [],
        },
    ]
    roles = {}
    for role_item in roles_data:
        obj = db.query(Role).filter(Role.name == role_item["name"]).first()
        if not obj:
            obj = Role(name=role_item["name"], description=role_item["description"])
            db.add(obj)
            db.commit()
            db.refresh(obj)
        obj.permissions = [permissions[p] for p in role_item["perms"] if p in permissions]
        db.commit()
        db.refresh(obj)
        roles[role_item["name"]] = obj

    # ── 4. Admin User ────────────────────────────────────────────────
    admin_user = db.query(User).filter(User.email == settings.SEED_ADMIN_EMAIL).first()
    if not admin_user:
        admin_user = User(
            email=settings.SEED_ADMIN_EMAIL,
            password_hash=get_password_hash(settings.SEED_ADMIN_PASSWORD),
            first_name="Global", last_name="Admin",
            is_active=True,
            department_id=departments["Executive Office"].id,
            role_id=roles["Administrator"].id,
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

    # ── 5. Demo Users ─────────────────────────────────────────────────
    demo_users = [
        {"email": "manager@entra-rbac.com",  "first": "Jane",  "last": "Smith",   "role": "Manager",          "dept": "Engineering"},
        {"email": "engineer@entra-rbac.com", "first": "John",  "last": "Doe",     "role": "Engineer",         "dept": "Engineering"},
        {"email": "security@entra-rbac.com", "first": "Sarah", "last": "Connor",  "role": "Security Officer", "dept": "Security Operations"},
        {"email": "intern@entra-rbac.com",   "first": "Alex",  "last": "Vance",   "role": "Intern",           "dept": "Engineering"},
        {"email": "visitor@entra-rbac.com",  "first": "Tom",   "last": "Riddle",  "role": "Visitor",          "dept": "Human Resources"},
    ]
    for u in demo_users:
        if not db.query(User).filter(User.email == u["email"]).first():
            db.add(User(
                email=u["email"],
                password_hash=get_password_hash("DemoPass123!"),
                first_name=u["first"], last_name=u["last"],
                is_active=True,
                department_id=departments[u["dept"]].id,
                role_id=roles[u["role"]].id,
            ))
    db.commit()

    # ── 6. Sample Rooms ───────────────────────────────────────────────
    rooms_data = [
        {"name": "Engineering Lab A",     "room_type": "Lab",             "building": "Technology Block",  "floor": "Ground Floor", "location": "Block A, East Wing",      "capacity": 20,  "description": "Primary engineering lab with workstations and testing equipment",           "requires_escort": False},
        {"name": "Main Library",          "room_type": "Library",         "building": "Academic Block",    "floor": "First Floor",  "location": "Central Campus",           "capacity": 100, "description": "Central knowledge repository with research materials",                    "requires_escort": False},
        {"name": "Executive Board Room",  "room_type": "Conference Room", "building": "HQ Tower",          "floor": "10th Floor",   "location": "HQ Tower, Top Floor",      "capacity": 15,  "description": "High-security board room for executive meetings",                        "requires_escort": True},
        {"name": "Open Office Floor",     "room_type": "Office",          "building": "Operations Block",  "floor": "2nd Floor",    "location": "Block B, West Wing",       "capacity": 80,  "description": "General open-plan office for day-to-day operations",                     "requires_escort": False},
        {"name": "Data Center / Server Room", "room_type": "Server Room", "building": "Technology Block",  "floor": "Basement",     "location": "Underground Level",        "capacity": 5,   "description": "Restricted access data center housing production servers",               "requires_escort": True},
        {"name": "Staff Cafeteria",       "room_type": "Cafeteria",       "building": "Amenities Block",   "floor": "Ground Floor", "location": "Block C, Ground Level",    "capacity": 200, "description": "Staff dining facility available during working hours",                   "requires_escort": False},
    ]
    seeded_rooms = {}
    for r in rooms_data:
        obj = db.query(Room).filter(Room.name == r["name"]).first()
        if not obj:
            obj = Room(**r)
            db.add(obj)
            db.commit()
            db.refresh(obj)
        seeded_rooms[r["name"]] = obj

    # ── 7. Room Access Grants (by Role) ───────────────────────────────
    admin_user_obj = db.query(User).filter(User.email == settings.SEED_ADMIN_EMAIL).first()
    if admin_user_obj:
        access_grants = [
            {"room": "Engineering Lab A",        "role": "Administrator",   "level": "Full Access"},
            {"room": "Engineering Lab A",        "role": "Manager",         "level": "Full Access"},
            {"room": "Engineering Lab A",        "role": "Engineer",        "level": "Full Access"},
            {"room": "Engineering Lab A",        "role": "Intern",          "level": "Read Only"},
            {"room": "Main Library",             "role": "Administrator",   "level": "Full Access"},
            {"room": "Main Library",             "role": "Manager",         "level": "Full Access"},
            {"room": "Main Library",             "role": "Engineer",        "level": "Full Access"},
            {"room": "Main Library",             "role": "Intern",          "level": "Read Only"},
            {"room": "Executive Board Room",     "role": "Administrator",   "level": "Full Access"},
            {"room": "Executive Board Room",     "role": "Manager",         "level": "Escorted Only"},
            {"room": "Open Office Floor",        "role": "Administrator",   "level": "Full Access"},
            {"room": "Open Office Floor",        "role": "Manager",         "level": "Full Access"},
            {"room": "Open Office Floor",        "role": "Engineer",        "level": "Full Access"},
            {"room": "Open Office Floor",        "role": "Security Officer","level": "Full Access"},
            {"room": "Open Office Floor",        "role": "Intern",          "level": "Full Access"},
            {"room": "Data Center / Server Room","role": "Administrator",   "level": "Full Access"},
            {"room": "Data Center / Server Room","role": "Security Officer","level": "Time Restricted"},
            {"room": "Staff Cafeteria",          "role": "Administrator",   "level": "Full Access"},
            {"room": "Staff Cafeteria",          "role": "Manager",         "level": "Full Access"},
            {"room": "Staff Cafeteria",          "role": "Engineer",        "level": "Full Access"},
            {"room": "Staff Cafeteria",          "role": "Security Officer","level": "Full Access"},
            {"room": "Staff Cafeteria",          "role": "Intern",          "level": "Full Access"},
        ]
        for g in access_grants:
            if g["room"] not in seeded_rooms or g["role"] not in roles:
                continue
            room_obj = seeded_rooms[g["room"]]
            role_obj = roles[g["role"]]
            exists = db.query(RoomAccess).filter(
                RoomAccess.room_id == room_obj.id,
                RoomAccess.role_id == role_obj.id,
            ).first()
            if not exists:
                db.add(RoomAccess(
                    room_id=room_obj.id,
                    role_id=role_obj.id,
                    access_level=g["level"],
                    granted_by_id=admin_user_obj.id,
                    is_active=True,
                ))
        db.commit()

    # ── 8. AI RAG Policy Documents ─────────────────────────────────────
    policies_rag = [
        {
            "title": "Security Lab A Operations & Access Standard",
            "content": "Engineering Lab A houses active hardware prototypes and electrical instrumentation. Access is restricted to Engineers, Managers, and Administrators. Interns are permitted Read Only access and must not operate heavy machinery. All visitors must be escorted by a full-time employee. Access is limited to standard business hours (8:00 AM - 6:00 PM).",
            "category": "Lab Access"
        },
        {
            "title": "Core Data Center Security & Escort Protocol",
            "content": "The Data Center Server Room contains critical production servers, databases, and network infrastructure. Only Administrators and designated Security Officers have direct swipe-card access. Escorts are strictly required for all other personnel, including external vendors. Physical access logs are audited weekly by the Compliance team. No unauthorized access is permitted.",
            "category": "Server Room"
        },
        {
            "title": "Visitor Campus Pass & Registration Guideline",
            "content": "Visitors registering for on-campus access must be hosted by a full-time employee. Temporary passes are generated with time-boxed durations (maximum 12 hours) and are valid only for authorized rooms. Approvals are routed through the manager of the host department. Visitors must wear temporary badges visibly at all times.",
            "category": "Visitor Policy"
        },
        {
            "title": "Executive Office & Board Room Governance Policy",
            "content": "The Executive Board Room is a highly restricted zone. Access is granted to Administrators. Managers have Escorted Access level. Standard engineers and interns do not have general clearance to reserve this room without executive sponsor signature. Access is restricted outside board meetings.",
            "category": "Office Policy"
        }
    ]
    for p_rag in policies_rag:
        exists = db.query(PolicyDocument).filter(PolicyDocument.title == p_rag["title"]).first()
        if not exists:
            db.add(PolicyDocument(**p_rag))
    db.commit()

    # ── 9. Compliance Policies ──────────────────────────────────────────
    compliance_policies = [
        {
            "name": "Enterprise Access Control Directive",
            "description": "Enforces least privilege configuration on active directory layers.",
            "category": "Access",
            "content": "Corporate policy requires that users are assigned roles matching their functional duties. Administrative accounts must utilize MFA. Access lists are reviewed quarterly."
        },
        {
            "name": "Physical Area Security Controls Policy",
            "description": "Establishes boundary controls for rooms and laboratories.",
            "category": "Security",
            "content": "Sensitive rooms (Server Room, Tech Labs) must be locked 24/7. Access is granted only to employees with valid business reasons. Visitor passes must be logged with Host details."
        }
    ]
    for p_comp in compliance_policies:
        exists = db.query(Policy).filter(Policy.name == p_comp["name"]).first()
        if not exists:
            new_p = Policy(
                name=p_comp["name"],
                description=p_comp["description"],
                category=p_comp["category"],
                is_active=True
            )
            db.add(new_p)
            db.commit()
            db.refresh(new_p)
            
            # Version 1
            ver = PolicyVersion(
                policy_id=new_p.id,
                version=1,
                content=p_comp["content"],
                created_by_id=admin_user_obj.id if admin_user_obj else None
            )
            db.add(ver)
            db.commit()

    # ── 10. Login History (Seeding data for Security Anomaly Detection) ──
    users_list = db.query(User).all()
    if users_list:
        ips = ["192.168.1.45", "192.168.1.102", "10.0.0.12", "192.168.1.55"]
        agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15"
        ]
        base_time = datetime.now(timezone.utc) - timedelta(days=5)
        
        for i in range(40):
            u = random.choice(users_list)
            login_time = base_time + timedelta(hours=i * 2 + random.randint(0, 45))
            hour_offset = random.randint(8, 18)
            login_time = login_time.replace(hour=hour_offset)
            
            log = LoginHistory(
                user_id=u.id,
                email=u.email,
                ip_address=random.choice(ips),
                user_agent=random.choice(agents),
                status="Success",
                timestamp=login_time
            )
            db.add(log)
            
        anomalous_ips = ["45.89.230.12", "185.220.101.5", "198.51.100.72"]
        for i in range(5):
            u = random.choice(users_list)
            login_time = base_time + timedelta(hours=i * 20)
            login_time = login_time.replace(hour=random.choice([1, 2, 3, 4]))
            
            log = LoginHistory(
                user_id=u.id,
                email=u.email,
                ip_address=random.choice(anomalous_ips),
                user_agent="Python-urllib/3.10",
                status="Failed",
                failure_reason="Invalid credentials / MFA Timeout",
                timestamp=login_time
            )
            db.add(log)
        db.commit()

    # ── 11. Visitor Passes ──────────────────────────────────────────────
    engineer_user = db.query(User).filter(User.email == "engineer@entra-rbac.com").first()
    manager_user = db.query(User).filter(User.email == "manager@entra-rbac.com").first()
    cafeteria_room = db.query(Room).filter(Room.name == "Staff Cafeteria").first()
    lab_room = db.query(Room).filter(Room.name == "Engineering Lab A").first()
    
    if engineer_user and cafeteria_room:
        exists_p1 = db.query(VisitorPass).filter(VisitorPass.qr_code_token == "PASS-MARCUS123").first()
        if not exists_p1:
            vis1 = Visitor(
                first_name="Marcus",
                last_name="Aurelius",
                email=f"marcus@{random.randint(10,99)}rome.org",
                company=f"Pax Romana Corp",
                host_id=engineer_user.id
            )
            db.add(vis1)
            db.commit()
            db.refresh(vis1)
            
            pass1 = VisitorPass(
                visitor_id=vis1.id,
                room_id=cafeteria_room.id,
                purpose="Business lunch",
                qr_code_token="PASS-MARCUS123",
                starts_at=datetime.now(timezone.utc) - timedelta(hours=1),
                expires_at=datetime.now(timezone.utc) + timedelta(hours=4),
                status="Checked In"
            )
            db.add(pass1)
            db.commit()

    if manager_user and lab_room:
        exists_p2 = db.query(VisitorPass).filter(VisitorPass.qr_code_token == "PASS-ADA999").first()
        if not exists_p2:
            vis2 = Visitor(
                first_name="Ada",
                last_name="Lovelace",
                email=f"ada@{random.randint(10,99)}analytical.net",
                company=f"Babbage Engines",
                host_id=manager_user.id
            )
            db.add(vis2)
            db.commit()
            db.refresh(vis2)
            
            pass2 = VisitorPass(
                visitor_id=vis2.id,
                room_id=lab_room.id,
                purpose="Inspect difference engine logs",
                qr_code_token="PASS-ADA999",
                starts_at=datetime.now(timezone.utc) + timedelta(hours=2),
                expires_at=datetime.now(timezone.utc) + timedelta(hours=6),
                status="Pending"
            )
            db.add(pass2)
            db.commit()

    # ── 12. Access Requests ──────────────────────────────────────────────
    intern_user = db.query(User).filter(User.email == "intern@entra-rbac.com").first()
    server_room = db.query(Room).filter(Room.name == "Data Center / Server Room").first()
    
    if intern_user and server_room and manager_user:
        exists_req1 = db.query(AccessRequest).filter(
            AccessRequest.requester_id == intern_user.id,
            AccessRequest.room_id == server_room.id,
            AccessRequest.reason.contains("rack cooling")
        ).first()
        if not exists_req1:
            req1 = AccessRequest(
                requester_id=intern_user.id,
                room_id=server_room.id,
                resource_name=server_room.name,
                duration_days=5,
                reason="Assist with server rack cooling configuration setup",
                risk_score=0.85,
                risk_reason="Requester holds Intern role | Target resource is highly restricted Data Center",
                status="Pending",
                manager_id=manager_user.id
            )
            db.add(req1)
            db.commit()
        
    if engineer_user and lab_room and manager_user:
        exists_req2 = db.query(AccessRequest).filter(
            AccessRequest.requester_id == engineer_user.id,
            AccessRequest.room_id == lab_room.id,
            AccessRequest.reason.contains("firmware prototyping")
        ).first()
        if not exists_req2:
            req2 = AccessRequest(
                requester_id=engineer_user.id,
                room_id=lab_room.id,
                resource_name=lab_room.name,
                duration_days=30,
                reason="Standard firmware prototyping project",
                risk_score=0.2,
                risk_reason="Standard access request within role scope",
                status="Approved",
                manager_id=manager_user.id,
                reviewed_at=datetime.now(timezone.utc) - timedelta(days=1)
            )
            db.add(req2)
            db.commit()

    # ── 13. Access Review Campaign ──────────────────────────────────────
    if manager_user:
        exists_campaign = db.query(AccessReview).filter(
            AccessReview.title == "Q3 Security Boundary Access Clearance Audit"
        ).first()
        if not exists_campaign:
            campaign = AccessReview(
                title="Q3 Security Boundary Access Clearance Audit",
                reviewer_id=manager_user.id,
                status="Pending",
                due_date=datetime.now(timezone.utc) + timedelta(days=14),
                details={"description": "Verify active room access assignments for all Engineers and Interns."}
            )
            db.add(campaign)
            db.commit()

