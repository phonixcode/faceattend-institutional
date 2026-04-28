"""
Lecturer routes — module management, lecture scheduling,
student registration, enrolment, and pending approvals.
"""
import os
import json
import uuid
import shutil
from datetime import datetime, date, time, timedelta
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.dependencies import require_lecturer
from app.models.user import User, Student
from app.models.academic import Module, ModuleEnrollment, Programme
from app.models.attendance import ScheduledLecture, AttendanceScan, AttendanceRecord, FaceEmbedding, ScanStatus
from app.models.registration import PendingRegistration
from app.schemas.academic import (
    ModuleCreate, ModuleResponse,
    StudentCreate, StudentResponse,
    EnrolmentCreate, ModuleStudentResponse, PaginatedResponse,
)
from app.schemas.attendance import LectureCreate, LectureResponse
from app.services.registration import (
    register_face_images, enrol_students_in_module, bulk_import_students
)
from app.core.security import hash_password

router = APIRouter()

UPLOADS = "pending_uploads"
PAGE_SIZE_DEFAULT = 20
PAGE_SIZE_MAX = 100


# ═══════════════════════════════════════════
#  DASHBOARD
# ═══════════════════════════════════════════

@router.get("/dashboard")
def lecturer_dashboard(
    current_user: User    = Depends(require_lecturer),
    db          : Session = Depends(get_db),
):
    modules = db.query(Module).filter(
        Module.lecturer_id == current_user.id,
        Module.is_active   == True,
    ).all()

    module_ids     = [m.id for m in modules]
    total_students = db.query(ModuleEnrollment).filter(
        ModuleEnrollment.module_id.in_(module_ids)
    ).count()

    pending_count  = db.query(PendingRegistration).filter(
        PendingRegistration.module_id.in_(module_ids),
        PendingRegistration.status == "pending",
    ).count()

    return {
        "total_modules" : len(modules),
        "total_students": total_students,
        "pending_approvals": pending_count,
        "modules"       : [
            {
                "id"         : m.id,
                "module_code": m.module_code,
                "module_name": m.module_name,
                "student_count": db.query(ModuleEnrollment).filter(
                    ModuleEnrollment.module_id == m.id
                ).count(),
            }
            for m in modules
        ],
    }


# ═══════════════════════════════════════════
#  MODULES
# ═══════════════════════════════════════════

@router.get("/modules")
def get_my_modules(
    current_user: User    = Depends(require_lecturer),
    db          : Session = Depends(get_db),
):
    modules = db.query(Module).filter(
        Module.lecturer_id == current_user.id,
        Module.is_active   == True,
    ).all()
    return modules


@router.get("/modules/{module_id}")
def get_module(
    module_id   : str,
    current_user: User    = Depends(require_lecturer),
    db          : Session = Depends(get_db),
):
    return _get_own_module(module_id, current_user.id, db)


# ═══════════════════════════════════════════
#  STUDENTS & ENROLMENT
# ═══════════════════════════════════════════

@router.get("/modules/{module_id}/students", response_model=PaginatedResponse[ModuleStudentResponse])
def get_module_students(
    module_id   : str,
    page       : int = 1,
    page_size  : int = PAGE_SIZE_DEFAULT,
    current_user: User    = Depends(require_lecturer),
    db          : Session = Depends(get_db),
):
    _get_own_module(module_id, current_user.id, db)

    page_size = min(max(1, page_size), PAGE_SIZE_MAX)
    q = db.query(ModuleEnrollment).filter(
        ModuleEnrollment.module_id == module_id
    ).order_by(ModuleEnrollment.enrolled_at.desc())
    total = q.count()
    enrolments = q.offset((page - 1) * page_size).limit(page_size).all()

    students = []
    for e in enrolments:
        student = db.query(Student).filter(Student.id == e.student_id).first()
        if student:
            students.append(ModuleStudentResponse(
                id=student.id,
                student_number=student.student_number,
                full_name=student.full_name,
                email=student.email,
                year_of_study=student.year_of_study,
                face_registered=student.face_registered,
                is_active=student.is_active,
                enrolled_at=e.enrolled_at,
            ))
    return PaginatedResponse(items=students, total=total, page=page, page_size=page_size)


@router.post("/modules/{module_id}/enrol")
def enrol_students(
    module_id   : str,
    body        : EnrolmentCreate,
    current_user: User    = Depends(require_lecturer),
    db          : Session = Depends(get_db),
):
    _get_own_module(module_id, current_user.id, db)
    new_enrolments = enrol_students_in_module(module_id, body.student_ids, db)
    return {"enrolled": len(new_enrolments), "message": f"{len(new_enrolments)} student(s) enrolled"}


@router.delete("/modules/{module_id}/students/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_student_from_module(
    module_id   : str,
    student_id  : str,
    current_user: User    = Depends(require_lecturer),
    db          : Session = Depends(get_db),
):
    _get_own_module(module_id, current_user.id, db)
    enrolment = db.query(ModuleEnrollment).filter(
        ModuleEnrollment.module_id  == module_id,
        ModuleEnrollment.student_id == student_id,
    ).first()
    if not enrolment:
        raise HTTPException(status_code=404, detail="Enrolment not found")
    db.delete(enrolment)
    db.commit()


# ── Register student face ─────────────────────────────────────────────────

@router.post("/students/register-face")
async def register_student_face(
    student_id  : str              = Form(...),
    images      : list[UploadFile] = File(...),
    current_user: User             = Depends(require_lecturer),
    db          : Session          = Depends(get_db),
):
    """
    Lecturer-led face registration.
    Accepts 3-7 face images, generates FaceNet embeddings, stores encrypted.
    """
    if len(images) < 3:
        raise HTTPException(status_code=400, detail="Minimum 3 images required")

    image_bytes_list = [await img.read() for img in images]
    stored = register_face_images(student_id, image_bytes_list, db)

    return {
        "message"       : "Face registered successfully",
        "student_id"    : student_id,
        "embeddings_stored": stored,
    }


# ── Bulk CSV import ───────────────────────────────────────────────────────

@router.post("/modules/{module_id}/students/bulk-import")
async def bulk_import(
    module_id   : str,
    file        : UploadFile,
    current_user: User    = Depends(require_lecturer),
    db          : Session = Depends(get_db),
):
    """
    Import students from CSV and auto-enrol in module.
    CSV columns: student_number, full_name, email, year_of_study
    """
    _get_own_module(module_id, current_user.id, db)

    module   = db.query(Module).filter(Module.id == module_id).first()
    csv_bytes= await file.read()
    result   = bulk_import_students(csv_bytes, module.programme_id, db)

    # Auto-enrol imported students
    students = db.query(Student).filter(
        Student.student_number.in_(result["details"]["created"])
    ).all()
    enrol_students_in_module(module_id, [s.id for s in students], db)

    return {**result, "auto_enrolled": len(students)}


# ── Create student manually ───────────────────────────────────────────────

@router.post("/students", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def create_student(
    body        : StudentCreate,
    current_user: User    = Depends(require_lecturer),
    db          : Session = Depends(get_db),
):
    if db.query(Student).filter(Student.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(Student).filter(Student.student_number == body.student_number).first():
        raise HTTPException(status_code=400, detail="Student number already registered")

    student = Student(
        id            = str(uuid.uuid4()),
        student_number= body.student_number,
        full_name     = body.full_name,
        email         = body.email,
        password_hash = hash_password(body.password),
        programme_id  = body.programme_id,
        year_of_study = body.year_of_study,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


# ═══════════════════════════════════════════
#  PENDING SELF-REGISTRATIONS
# ═══════════════════════════════════════════

@router.get("/pending-registrations")
def get_pending_registrations(
    current_user: User    = Depends(require_lecturer),
    db          : Session = Depends(get_db),
):
    module_ids = [
        m.id for m in db.query(Module).filter(
            Module.lecturer_id == current_user.id
        ).all()
    ]
    pending = db.query(PendingRegistration).filter(
        PendingRegistration.module_id.in_(module_ids),
        PendingRegistration.status == "pending",
    ).order_by(PendingRegistration.submitted_at.desc()).all()

    results = []
    for reg in pending:
        module = db.query(Module).filter(Module.id == reg.module_id).first()
        results.append({
            "id"            : reg.id,
            "full_name"     : reg.full_name,
            "student_number": reg.student_number,
            "email"         : reg.email,
            "module_code"   : module.module_code if module else "",
            "module_name"   : module.module_name if module else "",
            "submitted_at"  : reg.submitted_at,
        })
    return results


@router.post("/pending-registrations/{reg_id}/approve")
def approve_registration(
    reg_id      : str,
    current_user: User    = Depends(require_lecturer),
    db          : Session = Depends(get_db),
):
    reg = _get_pending_or_404(reg_id, db)

    # Check lecturer owns this module
    module = db.query(Module).filter(
        Module.id          == reg.module_id,
        Module.lecturer_id == current_user.id,
    ).first()
    if not module:
        raise HTTPException(status_code=403, detail="Not authorised for this module")

    # Create student account
    if db.query(Student).filter(Student.email == reg.email).first():
        raise HTTPException(status_code=400, detail="A student with this email already exists")

    student = Student(
        id            = str(uuid.uuid4()),
        student_number= reg.student_number,
        full_name     = reg.full_name,
        email         = reg.email,
        password_hash = hash_password(reg.student_number),  # default password = student number
        programme_id  = module.programme_id,
    )
    db.add(student)
    db.flush()  # get student.id before commit

    # Generate embeddings from saved images
    image_paths = json.loads(reg.images_path)
    image_bytes_list = []
    for path in image_paths:
        if os.path.exists(path):
            with open(path, "rb") as f:
                image_bytes_list.append(f.read())

    stored = 0
    if image_bytes_list:
        try:
            stored = register_face_images(student.id, image_bytes_list, db)
        except HTTPException:
            pass  # Student created even if face registration fails — can re-register

    # Enrol in module
    enrolment = ModuleEnrollment(
        id        = str(uuid.uuid4()),
        module_id = reg.module_id,
        student_id= student.id,
    )
    db.add(enrolment)

    # Clean up temp files
    folder = os.path.join(UPLOADS, reg_id)
    if os.path.exists(folder):
        shutil.rmtree(folder)

    reg.status      = "approved"
    reg.reviewed_at = datetime.utcnow()
    reg.reviewed_by = current_user.id
    db.commit()

    return {
        "message"       : f"{reg.full_name} approved and enrolled",
        "student_id"    : student.id,
        "embeddings_stored": stored,
    }


@router.post("/pending-registrations/{reg_id}/reject")
def reject_registration(
    reg_id      : str,
    current_user: User    = Depends(require_lecturer),
    db          : Session = Depends(get_db),
):
    reg = _get_pending_or_404(reg_id, db)

    folder = os.path.join(UPLOADS, reg_id)
    if os.path.exists(folder):
        shutil.rmtree(folder)

    reg.status      = "rejected"
    reg.reviewed_at = datetime.utcnow()
    reg.reviewed_by = current_user.id
    db.commit()

    return {"message": f"{reg.full_name} registration rejected"}


# ═══════════════════════════════════════════
#  LECTURE SCHEDULING
# ═══════════════════════════════════════════

@router.get("/modules/{module_id}/lectures")
def get_module_lectures(
    module_id   : str,
    current_user: User    = Depends(require_lecturer),
    db          : Session = Depends(get_db),
):
    _get_own_module(module_id, current_user.id, db)
    lectures = db.query(ScheduledLecture).filter(
        ScheduledLecture.module_id   == module_id,
        ScheduledLecture.is_cancelled== False,
    ).order_by(ScheduledLecture.date.desc()).all()
    return lectures


@router.post("/modules/{module_id}/lectures", status_code=status.HTTP_201_CREATED)
def create_lecture(
    module_id   : str,
    body        : LectureCreate,
    current_user: User    = Depends(require_lecturer),
    db          : Session = Depends(get_db),
):
    _get_own_module(module_id, current_user.id, db)

    windows  = _calculate_scan_windows(body.date, body.start_time, body.end_time)
    lecture  = ScheduledLecture(
        id             = str(uuid.uuid4()),
        module_id      = module_id,
        date           = body.date,
        start_time     = body.start_time,
        end_time       = body.end_time,
        room           = body.room,
        is_recurring   = body.is_recurring,
        recur_day      = body.recur_day,
        **windows,
    )
    db.add(lecture)
    db.commit()
    db.refresh(lecture)
    return lecture


@router.delete("/modules/{module_id}/lectures/{lecture_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_lecture(
    module_id   : str,
    lecture_id  : str,
    current_user: User    = Depends(require_lecturer),
    db          : Session = Depends(get_db),
):
    _get_own_module(module_id, current_user.id, db)
    lecture = db.query(ScheduledLecture).filter(
        ScheduledLecture.id        == lecture_id,
        ScheduledLecture.module_id == module_id,
    ).first()
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")
    lecture.is_cancelled = True
    db.commit()


# ═══════════════════════════════════════════
#  PRIVATE HELPERS
# ═══════════════════════════════════════════

def _get_own_module(module_id: str, lecturer_id: str, db: Session) -> Module:
    """Fetch module and verify ownership — raises 403 if not the lecturer's module."""
    from app.models.user import UserRole
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    user = db.query(User).filter(User.id == lecturer_id).first()
    if user and user.role == UserRole.SYSTEM_ADMIN:
        return module  # Admin can access any module

    if module.lecturer_id != lecturer_id:
        raise HTTPException(status_code=403, detail="Not authorised for this module")
    return module


def _get_pending_or_404(reg_id: str, db: Session) -> PendingRegistration:
    reg = db.query(PendingRegistration).filter(PendingRegistration.id == reg_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    if reg.status != "pending":
        raise HTTPException(status_code=400, detail=f"Registration already {reg.status}")
    return reg


def _calculate_scan_windows(
    lecture_date: date,
    start       : time,
    end         : time,
) -> dict:
    """
    Auto-calculate three scan window open/close times.
    Scan 1: first 15 minutes
    Scan 2: midpoint ± 5 minutes
    Scan 3: last 15 minutes
    """
    start_dt = datetime.combine(lecture_date, start)
    end_dt   = datetime.combine(lecture_date, end)
    duration = end_dt - start_dt
    midpoint = start_dt + duration / 2

    return {
        "scan1_opens_at" : start_dt,
        "scan1_closes_at": start_dt + timedelta(minutes=15),
        "scan2_opens_at" : midpoint  - timedelta(minutes=5),
        "scan2_closes_at": midpoint  + timedelta(minutes=5),
        "scan3_opens_at" : end_dt    - timedelta(minutes=15),
        "scan3_closes_at": end_dt,
    }