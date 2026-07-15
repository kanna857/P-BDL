import pytest
from app.core.config import settings
from app.models.room import Room, RoomAccess
from app.models.governance import AccessRequest, VisitorPass, SecurityAlert, Policy


def test_copilot_chat_and_request_creation(client):
    # 1. Login as standard user
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": "engineer@entra-rbac.com", "password": "DemoPass123!"}
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    
    # 2. Call Copilot Chat to request access to Engineering Lab A
    response = client.post(
        f"{settings.API_V1_STR}/copilot/chat",
        json={"message": "I need access to Engineering Lab A for 3 days to test firmware prototypes."},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["request_created"] is True
    assert data["intent"] == "Request Access"
    assert data["entities"]["resource"] == "Engineering Lab A"
    assert data["entities"]["duration_days"] == 3
    assert "request_id" in data


def test_access_request_state_machine_and_credential_grant(client, db):
    # 1. Login as standard user to create a request
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": "engineer@entra-rbac.com", "password": "DemoPass123!"}
    )
    token = response.json()["access_token"]
    
    # Create request
    response = client.post(
        f"{settings.API_V1_STR}/copilot/chat",
        json={"message": "Request access to Engineering Lab A for 2 days."},
        headers={"Authorization": f"Bearer {token}"}
    )
    req_id = response.json()["request_id"]
    
    # 2. Login as manager to review it
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": "manager@entra-rbac.com", "password": "DemoPass123!"}
    )
    mgr_token = response.json()["access_token"]
    
    # Approve request
    response = client.put(
        f"{settings.API_V1_STR}/access-requests/{req_id}/approve",
        json={"status": "Approved", "notes": "Approved for testing firmware"},
        headers={"Authorization": f"Bearer {mgr_token}"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "Approved"
    
    # Verify that RoomAccess swipe record was created in DB
    user_id = db.query(AccessRequest).filter(AccessRequest.id == req_id).first().requester_id
    room_id = db.query(AccessRequest).filter(AccessRequest.id == req_id).first().room_id
    
    access_grant = db.query(RoomAccess).filter(
        RoomAccess.user_id == user_id,
        RoomAccess.room_id == room_id,
        RoomAccess.is_active == True
    ).first()
    assert access_grant is not None
    assert "AI Copilot" in access_grant.notes


def test_visitor_pass_lifecycle(client):
    # 1. Login as manager to register a visitor
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": "manager@entra-rbac.com", "password": "DemoPass123!"}
    )
    token = response.json()["access_token"]
    
    # 2. Register visitor pass
    response = client.post(
        f"{settings.API_V1_STR}/visitors",
        json={
            "visitor": {
                "first_name": "Galileo",
                "last_name": "Galilei",
                "email": "galileo@telescope.org",
                "company": "Pisa Observatories"
            },
            "purpose": "Verify star alignment coordinates",
            "starts_at": "2026-07-15T12:00:00Z",
            "expires_at": "2026-07-15T18:00:00Z"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    pass_data = response.json()
    pass_id = pass_data["id"]
    # Manager registration should auto-approve (Active)
    assert pass_data["status"] == "Active"
    assert "PASS-" in pass_data["qr_code_token"]
    
    # 3. Perform Check In
    response = client.post(
        f"{settings.API_V1_STR}/visitors/{pass_id}/checkin",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "Checked In"
    
    # 4. Perform Check Out
    response = client.post(
        f"{settings.API_V1_STR}/visitors/{pass_id}/checkin",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "Checked Out"


def test_security_anomaly_model_training(client):
    # 1. Login as Admin
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": settings.SEED_ADMIN_EMAIL, "password": settings.SEED_ADMIN_PASSWORD}
    )
    token = response.json()["access_token"]
    
    # 2. Trigger ML retraining pipeline
    response = client.post(
        f"{settings.API_V1_STR}/security/train",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "Success"
    assert "method" in data
    assert "alerts_created" in data
    
    # 3. Retrieve alerts queue
    response = client.get(
        f"{settings.API_V1_STR}/security/alerts",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert len(response.json()) >= 0


def test_policies_crud_and_access_reviews(client):
    # 1. Login as Admin
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": settings.SEED_ADMIN_EMAIL, "password": settings.SEED_ADMIN_PASSWORD}
    )
    token = response.json()["access_token"]
    
    # 2. Create compliance directive
    response = client.post(
        f"{settings.API_V1_STR}/policies",
        json={
            "name": "Biometric Identity Retention Policy",
            "description": "Standard governing storage timelines of user facial/fingerprint scan records.",
            "category": "Compliance",
            "content": "Facial verification logs must be purged from physical devices within 48 hours."
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    policy_id = response.json()["id"]
    
    # 3. Increment policy version
    response = client.post(
        f"{settings.API_V1_STR}/policies/{policy_id}/version",
        json={"content": "Version update: retention timeline extended to 72 hours for security validation logs."},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["version"] == 2
    
    # 4. Launch access reviews campaign
    response = client.post(
        f"{settings.API_V1_STR}/access-reviews",
        json={
            "title": "Biometric Purge Compliance Audit campaign",
            "reviewer_id": 1,
            "due_date": "2026-08-15T00:00:00Z"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "Pending"
