import uuid
import enum
from datetime import datetime, date, time
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Float, Integer, Date, Time, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class AttendanceGrade(str, enum.Enum):
    FULL         = "FULL"
    PARTIAL      = "PARTIAL"
    LEFT_EARLY   = "LEFT_EARLY"
    ARRIVED_LATE = "ARRIVED_LATE"
    SUSPICIOUS   = "SUSPICIOUS"
    ABSENT       = "ABSENT"


class ScanStatus(str, enum.Enum):
    PENDING = "PENDING"
    OPEN    = "OPEN"
    CLOSED  = "CLOSED"


class ScheduledLecture(Base):
    __tablename__ = "scheduled_lectures"

    id             : Mapped[str]       = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    module_id      : Mapped[str]       = mapped_column(ForeignKey("modules.id"), nullable=False)
    date           : Mapped[date]      = mapped_column(Date, nullable=False)
    start_time     : Mapped[time]      = mapped_column(Time, nullable=False)
    end_time       : Mapped[time]      = mapped_column(Time, nullable=False)
    room           : Mapped[str]       = mapped_column(String, default="TBD")
    scan1_opens_at : Mapped[datetime]  = mapped_column(DateTime, nullable=False)
    scan1_closes_at: Mapped[datetime]  = mapped_column(DateTime, nullable=False)
    scan2_opens_at : Mapped[datetime]  = mapped_column(DateTime, nullable=False)
    scan2_closes_at: Mapped[datetime]  = mapped_column(DateTime, nullable=False)
    scan3_opens_at : Mapped[datetime]  = mapped_column(DateTime, nullable=False)
    scan3_closes_at: Mapped[datetime]  = mapped_column(DateTime, nullable=False)
    is_recurring   : Mapped[bool]      = mapped_column(Boolean, default=False)
    recur_day      : Mapped[str|None]  = mapped_column(String, nullable=True)
    is_cancelled   : Mapped[bool]      = mapped_column(Boolean, default=False)
    created_at     : Mapped[datetime]  = mapped_column(DateTime, default=datetime.utcnow)

    module = relationship("Module", back_populates="lectures")
    scans  = relationship("AttendanceScan", back_populates="lecture", cascade="all, delete-orphan")


class AttendanceScan(Base):
    __tablename__ = "attendance_scans"

    id          : Mapped[str]        = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    lecture_id  : Mapped[str]        = mapped_column(ForeignKey("scheduled_lectures.id"), nullable=False)
    scan_number : Mapped[int]        = mapped_column(Integer, nullable=False)  # 1, 2, or 3
    status      : Mapped[ScanStatus] = mapped_column(SAEnum(ScanStatus), default=ScanStatus.PENDING)
    opened_by   : Mapped[str|None]   = mapped_column(String, nullable=True)
    opened_at   : Mapped[datetime|None] = mapped_column(DateTime, nullable=True)
    closed_at   : Mapped[datetime|None] = mapped_column(DateTime, nullable=True)
    created_at  : Mapped[datetime]   = mapped_column(DateTime, default=datetime.utcnow)

    lecture = relationship("ScheduledLecture", back_populates="scans")
    records = relationship("AttendanceRecord", back_populates="scan", cascade="all, delete-orphan")


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id            : Mapped[str]      = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    scan_id       : Mapped[str]      = mapped_column(ForeignKey("attendance_scans.id"), nullable=False)
    student_id    : Mapped[str]      = mapped_column(ForeignKey("students.id"), nullable=False)
    confidence    : Mapped[float]    = mapped_column(Float, default=0.0)
    needs_review  : Mapped[bool]     = mapped_column(Boolean, default=False)
    faces_in_frame: Mapped[int]      = mapped_column(Integer, default=1)
    marked_at     : Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    scan    = relationship("AttendanceScan", back_populates="records")
    student = relationship("Student")


class FaceEmbedding(Base):
    __tablename__ = "face_embeddings"

    id         : Mapped[str]      = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id : Mapped[str]      = mapped_column(ForeignKey("students.id"), nullable=False)
    embedding  : Mapped[str]      = mapped_column(String, nullable=False)  # AES-256 encrypted JSON
    created_at : Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="face_embeddings")


class RecognitionLog(Base):
    __tablename__ = "recognition_log"

    id         : Mapped[str]      = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    scan_id    : Mapped[str|None] = mapped_column(String, nullable=True)
    student_id : Mapped[str|None] = mapped_column(String, nullable=True)
    result     : Mapped[str]      = mapped_column(String, nullable=False)  # MATCH | UNKNOWN | ERROR
    confidence : Mapped[float]    = mapped_column(Float, default=0.0)
    distance   : Mapped[float]    = mapped_column(Float, default=0.0)
    timestamp  : Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)