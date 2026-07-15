from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class DepartmentInDB(DepartmentBase):
    id: int
    created_at: datetime
    user_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)


class DepartmentResponse(DepartmentInDB):
    pass
