import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import enum


class UserRole(str, enum.Enum):
    SYSTEM_ADMIN        = "SYSTEM_ADMIN"
    PROGRAMME_DIRECTOR  = "PROGRAMME_DIRECTOR"
    LECTURER            = "LECTURER"
    MODULE_COORDINATOR  = "MODULE_COORDINATOR"
    STUDENT             = "STUDENT"


class User(Base):
    __tablename__ = "users"

    id            : Mapped[str]      = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email         : Mapped[str]      = mapped_column(String, unique=True, nullable=False, index=True)
    full_name     : Mapped[str]      = mapped_column(String, nullable=False)
    password_hash : Mapped[str]      = mapped_column(String, nullable=False)
    role          : Mapped[UserRole] = mapped_column(SAEnum(UserRole), nullable=False)
    department_id : Mapped[str|None] = mapped_column(String, nullable=True)
    totp_secret   : Mapped[str|None] = mapped_column(String, nullable=True)
    totp_enabled  : Mapped[bool]     = mapped_column(Boolean, default=False)
    is_active     : Mapped[bool]     = mapped_column(Boolean, default=True)
    created_at    : Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<User {self.email} [{self.role}]>"


class Student(Base):
    __tablename__ = "students"

    id             : Mapped[str]      = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    student_number : Mapped[str]      = mapped_column(String, unique=True, nullable=False, index=True)
    full_name      : Mapped[str]      = mapped_column(String, nullable=False)
    email          : Mapped[str]      = mapped_column(String, unique=True, nullable=False)
    password_hash  : Mapped[str]      = mapped_column(String, nullable=False)
    programme_id   : Mapped[str|None] = mapped_column(String, nullable=True)
    year_of_study  : Mapped[int]      = mapped_column(default=1)
    totp_secret    : Mapped[str|None] = mapped_column(String, nullable=True)
    totp_enabled   : Mapped[bool]     = mapped_column(Boolean, default=False)
    admission_year : Mapped[int]      = mapped_column(default=2024)
    is_active      : Mapped[bool]     = mapped_column(Boolean, default=True)
    face_registered: Mapped[bool]     = mapped_column(Boolean, default=False)
    created_at     : Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    enrollments    = relationship("ModuleEnrollment", back_populates="student")
    face_embeddings= relationship("FaceEmbedding",    back_populates="student", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Student {self.student_number} — {self.full_name}>"