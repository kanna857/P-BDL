from datetime import datetime, timedelta, timezone
from typing import List, Optional, Set
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.core.security import verify_password, verify_token, create_access_token, create_refresh_token
from app.models.user import User, UserSession
from app.models.role import Role
from app.models.permission import Permission

security_bearer = HTTPBearer(auto_error=False)


class AuthService:
    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return None
        if not verify_password(password, user.password_hash):
            return None
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is deactivated."
            )
        return user

    @staticmethod
    def create_user_session(
        db: Session,
        user_id: int,
        refresh_token: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> UserSession:
        # Revoke existing sessions to prevent session bloat, or keep it multi-device. Let's keep multi-device but clean old ones.
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        db_session = UserSession(
            user_id=user_id,
            refresh_token=refresh_token,
            ip_address=ip_address,
            user_agent=user_agent,
            expires_at=expires_at
        )
        db.add(db_session)
        db.commit()
        db.refresh(db_session)
        return db_session

    @staticmethod
    def revoke_user_session(db: Session, refresh_token: str) -> bool:
        session = db.query(UserSession).filter(UserSession.refresh_token == refresh_token).first()
        if session:
            db.delete(session)
            db.commit()
            return True
        return False

    @staticmethod
    def get_user_permissions(user: User) -> Set[str]:
        if not user.role:
            return set()
        # Administrators have all permissions implicitly
        if user.role.name == "Administrator":
            return {"*"}
        return {perm.name for perm in user.role.permissions}


# Dependency to get current user from JWT token
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_bearer),
    db: Session = Depends(get_db)
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    user_id = verify_token(token, settings.SECRET_KEY)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )
    return user


# Class-based dependency for checking permissions
class PermissionRequirement:
    def __init__(self, required_permissions: List[str]):
        self.required_permissions = required_permissions

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        user_perms = AuthService.get_user_permissions(current_user)
        
        # Admin bypass
        if "*" in user_perms:
            return current_user

        # Check if all required permissions are met
        for perm in self.required_permissions:
            if perm not in user_perms:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Not enough permissions. Required: {perm}"
                )
        return current_user
