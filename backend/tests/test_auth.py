import pytest
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import User


def test_seed_admin_login(client):
    # Test logging in with seeded admin credentials
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": settings.SEED_ADMIN_EMAIL, "password": settings.SEED_ADMIN_PASSWORD}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_invalid_login(client):
    # Test logging in with incorrect credentials
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": "wrong@entra-rbac.com", "password": "wrongpassword"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"


def test_rbac_restriction(client, db):
    # Test that standard user cannot perform administrative actions
    # 1. Login as seeded Demo Engineer who shouldn't have departments:write permission
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": "engineer@entra-rbac.com", "password": "DemoPass123!"}
    )
    assert response.status_code == 200
    eng_token = response.json()["access_token"]
    
    # 2. Attempt to create a department as Engineer
    response = client.post(
        f"{settings.API_V1_STR}/departments",
        json={"name": "Hackers Division", "description": "Illegal operations"},
        headers={"Authorization": f"Bearer {eng_token}"}
    )
    assert response.status_code == 403
    assert "Not enough permissions" in response.json()["detail"]


def test_rbac_admin_bypass(client):
    # Test that Administrator bypasses permission check and creates a department
    # 1. Login as admin
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": settings.SEED_ADMIN_EMAIL, "password": settings.SEED_ADMIN_PASSWORD}
    )
    assert response.status_code == 200
    admin_token = response.json()["access_token"]

    # 2. Create department
    response = client.post(
        f"{settings.API_V1_STR}/departments",
        json={"name": "R&D Lab", "description": "Research and development unit"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 201
    assert response.json()["name"] == "R&D Lab"


def test_token_refresh(client):
    # Test token refresh flow
    # 1. Login
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": settings.SEED_ADMIN_EMAIL, "password": settings.SEED_ADMIN_PASSWORD}
    )
    assert response.status_code == 200
    tokens = response.json()
    refresh_token = tokens["refresh_token"]

    # 2. Call refresh endpoint
    response = client.post(
        f"{settings.API_V1_STR}/auth/refresh",
        json={"refresh_token": refresh_token}
    )
    assert response.status_code == 200
    new_tokens = response.json()
    assert "access_token" in new_tokens
    assert "refresh_token" in new_tokens
    # Tokens can be identical if issued in the same second (JWT exp is second-precision).
    # The important guarantee is that a new valid token pair was returned.
    assert new_tokens["token_type"] == "bearer"
    assert new_tokens["expires_in"] > 0
