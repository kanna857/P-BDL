from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, ConfigDict
from app.schemas.department import DepartmentResponse
from app.schemas.role import RoleResponse


class UserBase(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: Optional[bool] = True


class UserCreate(UserBase):
    password: str
    department_id: Optional[int] = None
    role_id: Optional[int] = None


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: Optional[bool] = None
    department_id: Optional[int] = None
    role_id: Optional[int] = None


class UserInDB(UserBase):
    id: int
    department_id: Optional[int] = None
    role_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserResponse(UserInDB):
    department: Optional[DepartmentResponse] = None
    role: Optional[RoleResponse] = None


# Authentication response schemas
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # in seconds


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None
    type: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: Optional[bool] = False


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


# Password Reset Request
class PasswordResetSubmit(BaseModel):
    email: EmailStr
    new_password: str
