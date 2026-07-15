from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, create_refresh_token, verify_token, get_password_hash
from app.schemas.user import LoginRequest, Token, ForgotPasswordRequest, PasswordResetSubmit, UserResponse
from app.services.auth import AuthService, get_current_user, security_bearer
from app.services.audit import audit_service
from app.models.user import User, UserSession

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=Token)
def login(request: Request, login_data: LoginRequest, db: Session = Depends(get_db)):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    try:
        user = AuthService.authenticate_user(db, login_data.email, login_data.password)
        if not user:
            # Log failed login attempt
            audit_service.log_login(
                db=db,
                email=login_data.email,
                status="Failed",
                ip_address=ip_address,
                user_agent=user_agent,
                failure_reason="Invalid credentials"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )

        # Generate tokens
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(subject=user.id, expires_delta=access_token_expires)
        
        refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        refresh_token = create_refresh_token(subject=user.id, expires_delta=refresh_token_expires)

        # Create DB session entry
        AuthService.create_user_session(
            db=db,
            user_id=user.id,
            refresh_token=refresh_token,
            ip_address=ip_address,
            user_agent=user_agent
        )

        # Log successful login
        audit_service.log_login(
            db=db,
            user_id=user.id,
            email=user.email,
            status="Success",
            ip_address=ip_address,
            user_agent=user_agent
        )

        # Add Audit log for session start
        audit_service.log_action(
            db=db,
            user_id=user.id,
            action="USER_LOGIN",
            resource_type="User",
            resource_id=str(user.id),
            details={"email": user.email},
            ip_address=ip_address
        )

        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )

    except HTTPException as he:
        raise he
    except Exception as e:
        # Unexpected error
        audit_service.log_login(
            db=db,
            email=login_data.email,
            status="Failed",
            ip_address=ip_address,
            user_agent=user_agent,
            failure_reason=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during authentication"
        )


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Retrieve refresh token from authorization credentials, but wait: the client is sending refresh token in request body or header.
    # Let's get it from the request body or authorization header to delete it.
    # We will look for an Authorization credentials or we can delete all sessions for the user or just delete the active one.
    # Let's read the refresh token if provided. If not, delete all active sessions of this user.
    ip_address = request.client.host if request.client else None
    
    # We will delete all user sessions for simplicity, or we can look for specific token. Let's delete all sessions for security.
    sessions = db.query(UserSession).filter(UserSession.user_id == current_user.id).all()
    for session in sessions:
        db.delete(session)
    db.commit()

    # Log logout action
    audit_service.log_action(
        db=db,
        user_id=current_user.id,
        action="USER_LOGOUT",
        resource_type="User",
        resource_id=str(current_user.id),
        details={"email": current_user.email},
        ip_address=ip_address
    )
    return {"detail": "Successfully logged out."}


@router.post("/refresh", response_model=Token)
def refresh_token(request: Request, token_data: dict, db: Session = Depends(get_db)):
    # Expects {"refresh_token": "..."}
    r_token = token_data.get("refresh_token")
    if not r_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Refresh token required")

    user_id = verify_token(r_token, settings.REFRESH_SECRET_KEY)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    # Check if session exists in DB
    session = db.query(UserSession).filter(UserSession.refresh_token == r_token).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session revoked or expired")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account is deactivated or not found")

    # Generate new access and refresh tokens
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    new_access_token = create_access_token(subject=user.id, expires_delta=access_token_expires)

    new_refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    new_refresh_token = create_refresh_token(subject=user.id, expires_delta=new_refresh_token_expires)

    # Update session in DB
    session.refresh_token = new_refresh_token
    session.expires_at = datetime.now(timezone.utc) + new_refresh_token_expires
    session.created_at = datetime.now(timezone.utc)
    session.ip_address = request.client.host if request.client else session.ip_address
    session.user_agent = request.headers.get("user-agent") or session.user_agent
    db.commit()

    return Token(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.post("/forgot-password")
def forgot_password(request: Request, data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    # Entra ID styled Forgot password logic
    user = db.query(User).filter(User.email == data.email).first()
    ip_address = request.client.host if request.client else None
    
    if user:
        # Log forgot password action
        audit_service.log_action(
            db=db,
            user_id=user.id,
            action="FORGOT_PASSWORD_REQUEST",
            resource_type="User",
            resource_id=str(user.id),
            details={"email": user.email, "status": "Success"},
            ip_address=ip_address
        )
    return {"message": "If this email is registered in our directories, a password reset link has been dispatched."}


@router.post("/reset-password")
def reset_password(request: Request, data: PasswordResetSubmit, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    user.password_hash = get_password_hash(data.new_password)
    db.commit()
    
    ip_address = request.client.host if request.client else None
    audit_service.log_action(
        db=db,
        user_id=user.id,
        action="PASSWORD_RESET_SUCCESS",
        resource_type="User",
        resource_id=str(user.id),
        details={"email": user.email},
        ip_address=ip_address
    )
    return {"message": "Password has been successfully updated."}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
