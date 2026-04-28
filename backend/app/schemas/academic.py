from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, TypeVar, Generic
from app.models.user import UserRole

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int


# ── University ────────────────────────────────────────────────────────────

class UniversityCreate(BaseModel):
    name   : str
    country: str = "Ireland"

class UniversityResponse(BaseModel):
    id        : str
    name      : str
    country   : str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Department ────────────────────────────────────────────────────────────

class DepartmentCreate(BaseModel):
    name         : str
    university_id: str

class DepartmentResponse(BaseModel):
    id           : str
    name         : str
    university_id: str
    created_at   : datetime

    class Config:
        from_attributes = True


# ── Programme ─────────────────────────────────────────────────────────────

class ProgrammeCreate(BaseModel):
    name         : str
    department_id: str
    director_id  : Optional[str] = None

class ProgrammeResponse(BaseModel):
    id           : str
    name         : str
    department_id: str
    director_id  : Optional[str]
    is_active    : bool
    created_at   : datetime

    class Config:
        from_attributes = True


# ── Module ────────────────────────────────────────────────────────────────

class ModuleCreate(BaseModel):
    module_code  : str
    module_name  : str
    programme_id : str
    lecturer_id  : str
    academic_year: str = "2024/2025"
    semester     : str = "1"

class ModuleUpdate(BaseModel):
    module_name  : Optional[str] = None
    lecturer_id  : Optional[str] = None
    academic_year: Optional[str] = None
    semester     : Optional[str] = None
    is_active    : Optional[bool]= None

class ModuleResponse(BaseModel):
    id           : str
    module_code  : str
    module_name  : str
    programme_id : str
    lecturer_id  : str
    academic_year: str
    semester     : str
    is_active    : bool
    created_at   : datetime

    class Config:
        from_attributes = True


# ── User management ───────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email        : EmailStr
    full_name    : str
    password     : str
    role         : UserRole
    department_id: Optional[str] = None

class UserUpdate(BaseModel):
    full_name    : Optional[str]     = None
    role         : Optional[UserRole]= None
    department_id: Optional[str]     = None
    is_active    : Optional[bool]    = None

class UserResponse(BaseModel):
    id           : str
    email        : str
    full_name    : str
    role         : str
    department_id: Optional[str]
    is_active    : bool
    totp_enabled : bool
    created_at   : datetime

    class Config:
        from_attributes = True


# ── Student management ────────────────────────────────────────────────────

class StudentCreate(BaseModel):
    student_number: str
    full_name     : str
    email         : EmailStr
    password      : str
    programme_id  : Optional[str] = None
    year_of_study : int = 1

class StudentResponse(BaseModel):
    id            : str
    student_number: str
    full_name     : str
    email         : str
    programme_id  : Optional[str]
    year_of_study : int
    is_active     : bool
    face_registered: bool
    created_at    : datetime

    class Config:
        from_attributes = True


# ── Module student (lecturer list) ────────────────────────────────────────

class ModuleStudentResponse(BaseModel):
    id             : str
    student_number : str
    full_name      : str
    email          : str
    year_of_study  : int = 1
    face_registered: bool
    is_active      : bool = True
    enrolled_at    : datetime


# ── Enrolment ─────────────────────────────────────────────────────────────

class EnrolmentCreate(BaseModel):
    student_ids: list[str]

class EnrolmentResponse(BaseModel):
    id         : str
    module_id  : str
    student_id : str
    enrolled_at: datetime

    class Config:
        from_attributes = True