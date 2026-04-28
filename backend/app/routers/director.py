"""
Programme Director routes — read-only view across their programme.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.dependencies import require_director
from app.models.user import User, Student
from app.models.academic import Programme, Module, ModuleEnrollment
from app.models.attendance import ScheduledLecture, AttendanceScan, AttendanceRecord
from app.schemas.academic import ModuleResponse, PaginatedResponse

router = APIRouter()

PAGE_SIZE_DEFAULT = 20
PAGE_SIZE_MAX = 100


@router.get("/dashboard")
def director_dashboard(
    current_user: User    = Depends(require_director),
    db          : Session = Depends(get_db),
):
    programme = db.query(Programme).filter(
        Programme.director_id == current_user.id
    ).first()

    if not programme:
        return {"message": "No programme assigned", "modules": []}

    modules = db.query(Module).filter(
        Module.programme_id == programme.id,
        Module.is_active    == True,
    ).all()

    module_ids     = [m.id for m in modules]
    total_students = db.query(ModuleEnrollment).filter(
        ModuleEnrollment.module_id.in_(module_ids)
    ).distinct(ModuleEnrollment.student_id).count()

    total_lectures = db.query(ScheduledLecture).filter(
        ScheduledLecture.module_id.in_(module_ids),
        ScheduledLecture.is_cancelled == False,
    ).count()

    return {
        "programme_id"  : programme.id,
        "programme_name": programme.name,
        "total_modules" : len(modules),
        "total_students": total_students,
        "total_lectures": total_lectures,
        "modules"       : [
            {
                "id"          : m.id,
                "module_code" : m.module_code,
                "module_name" : m.module_name,
                "lecturer_id" : m.lecturer_id,
                "student_count": db.query(ModuleEnrollment).filter(
                    ModuleEnrollment.module_id == m.id
                ).count(),
            }
            for m in modules
        ],
    }


@router.get("/modules", response_model=PaginatedResponse[ModuleResponse])
def get_programme_modules(
    page       : int = 1,
    page_size  : int = PAGE_SIZE_DEFAULT,
    current_user: User    = Depends(require_director),
    db          : Session = Depends(get_db),
):
    programme = db.query(Programme).filter(
        Programme.director_id == current_user.id
    ).first()
    if not programme:
        return PaginatedResponse(items=[], total=0, page=1, page_size=page_size)

    page_size = min(max(1, page_size), PAGE_SIZE_MAX)
    q = db.query(Module).filter(
        Module.programme_id == programme.id,
        Module.is_active    == True,
    ).order_by(Module.module_code)
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/reports")
def programme_reports(
    current_user: User    = Depends(require_director),
    db          : Session = Depends(get_db),
):
    """Programme-wide attendance overview across all modules."""
    programme = db.query(Programme).filter(
        Programme.director_id == current_user.id
    ).first()
    if not programme:
        raise HTTPException(status_code=404, detail="No programme assigned")

    modules = db.query(Module).filter(
        Module.programme_id == programme.id,
        Module.is_active    == True,
    ).all()

    report = []
    for module in modules:
        lectures = db.query(ScheduledLecture).filter(
            ScheduledLecture.module_id    == module.id,
            ScheduledLecture.is_cancelled == False,
        ).count()

        total_records = db.query(AttendanceRecord).join(
            AttendanceScan,
            AttendanceRecord.scan_id == AttendanceScan.id
        ).join(
            ScheduledLecture,
            AttendanceScan.lecture_id == ScheduledLecture.id
        ).filter(
            ScheduledLecture.module_id == module.id
        ).count()

        enrolled = db.query(ModuleEnrollment).filter(
            ModuleEnrollment.module_id == module.id
        ).count()

        report.append({
            "module_id"      : module.id,
            "module_code"    : module.module_code,
            "module_name"    : module.module_name,
            "total_lectures" : lectures,
            "total_enrolled" : enrolled,
            "total_records"  : total_records,
        })

    return {
        "programme_name": programme.name,
        "modules"       : report,
    }