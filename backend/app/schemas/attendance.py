from pydantic import BaseModel
from datetime import datetime, date, time
from typing import Optional
from app.models.attendance import AttendanceGrade, ScanStatus


# ── Lecture scheduling ────────────────────────────────────────────────────

class LectureCreate(BaseModel):
    module_id : str
    date      : date
    start_time: time
    end_time  : time
    room      : str = "TBD"
    is_recurring: bool = False
    recur_day   : Optional[str] = None  # MON | TUE | WED | THU | FRI


class LectureResponse(BaseModel):
    id             : str
    module_id      : str
    date           : date
    start_time     : time
    end_time       : time
    room           : str
    scan1_opens_at : datetime
    scan1_closes_at: datetime
    scan2_opens_at : datetime
    scan2_closes_at: datetime
    scan3_opens_at : datetime
    scan3_closes_at: datetime
    is_recurring   : bool
    recur_day      : Optional[str]
    is_cancelled   : bool
    created_at     : datetime

    class Config:
        from_attributes = True


# ── Scan windows ──────────────────────────────────────────────────────────

class ScanOpenRequest(BaseModel):
    lecture_id : str
    scan_number: int  # 1, 2, or 3


class ScanResponse(BaseModel):
    id         : str
    lecture_id : str
    scan_number: int
    status     : ScanStatus
    opened_at  : Optional[datetime]
    closed_at  : Optional[datetime]

    class Config:
        from_attributes = True


# ── Check-in ──────────────────────────────────────────────────────────────

class CheckinResult(BaseModel):
    status    : str       # MATCH | UNKNOWN | ERROR
    student_id: Optional[str]
    full_name : Optional[str]
    confidence: float
    needs_review: bool = False


class CheckinResponse(BaseModel):
    scan_id        : str
    faces_detected : int
    faces_recognised: int
    results        : list[CheckinResult]


# ── Attendance records ────────────────────────────────────────────────────

class AttendanceRecordResponse(BaseModel):
    id          : str
    student_id  : str
    full_name   : str
    student_number: str
    scan_number : int
    confidence  : float
    needs_review: bool
    marked_at   : datetime

    class Config:
        from_attributes = True


class LectureGradeSummary(BaseModel):
    student_id    : str
    full_name     : str
    student_number: str
    scan1_present : bool
    scan2_present : bool
    scan3_present : bool
    grade         : AttendanceGrade
    grade_weight  : float


class ModuleAttendanceReport(BaseModel):
    module_id  : str
    module_code: str
    module_name: str
    total_lectures: int
    students   : list[dict]