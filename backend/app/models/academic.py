import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class University(Base):
    __tablename__ = "universities"

    id         : Mapped[str]      = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name       : Mapped[str]      = mapped_column(String, nullable=False)
    country    : Mapped[str]      = mapped_column(String, default="Ireland")
    created_at : Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    departments = relationship("Department", back_populates="university")


class Department(Base):
    __tablename__ = "departments"

    id            : Mapped[str]      = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name          : Mapped[str]      = mapped_column(String, nullable=False)
    university_id : Mapped[str]      = mapped_column(ForeignKey("universities.id"), nullable=False)
    created_at    : Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    university  = relationship("University", back_populates="departments")
    programmes  = relationship("Programme",  back_populates="department")


class Programme(Base):
    __tablename__ = "programmes"

    id            : Mapped[str]      = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name          : Mapped[str]      = mapped_column(String, nullable=False)
    department_id : Mapped[str]      = mapped_column(ForeignKey("departments.id"), nullable=False)
    director_id   : Mapped[str|None] = mapped_column(String, nullable=True)  # FK to users
    is_active     : Mapped[bool]     = mapped_column(Boolean, default=True)
    created_at    : Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    department = relationship("Department", back_populates="programmes")
    modules    = relationship("Module",     back_populates="programme")


class Module(Base):
    __tablename__ = "modules"

    id            : Mapped[str]      = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    module_code   : Mapped[str]      = mapped_column(String, nullable=False, index=True)
    module_name   : Mapped[str]      = mapped_column(String, nullable=False)
    programme_id  : Mapped[str]      = mapped_column(ForeignKey("programmes.id"), nullable=False)
    lecturer_id   : Mapped[str]      = mapped_column(String, nullable=False)  # FK to users
    year_of_study : Mapped[int]      = mapped_column(Integer, default=1)
    academic_year : Mapped[str]      = mapped_column(String, default="2024/2025")
    semester      : Mapped[str]      = mapped_column(String, default="1")
    is_active     : Mapped[bool]     = mapped_column(Boolean, default=True)
    created_at    : Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    programme   = relationship("Programme",         back_populates="modules")
    enrollments = relationship("ModuleEnrollment",  back_populates="module",  cascade="all, delete-orphan")
    lectures    = relationship("ScheduledLecture",  back_populates="module",  cascade="all, delete-orphan")


class ModuleEnrollment(Base):
    __tablename__ = "module_enrollments"

    id          : Mapped[str]      = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    module_id   : Mapped[str]      = mapped_column(ForeignKey("modules.id"),   nullable=False)
    student_id  : Mapped[str]      = mapped_column(ForeignKey("students.id"),  nullable=False)
    enrolled_at : Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    module  = relationship("Module",   back_populates="enrollments")
    student = relationship("Student",  back_populates="enrollments")