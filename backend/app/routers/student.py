"""
Student portal routes — personal attendance view only.
"""
from datetime import date as _date
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.dependencies import get_current_student
from app.models.user import Student, User
from app.models.academic import Module, ModuleEnrollment, Programme, Department
from app.models.attendance import (
    ScheduledLecture, AttendanceScan, AttendanceRecord, AttendanceGrade
)
from app.services.attendance_grader import (
    calculate_grade, calculate_attendance_percentage,
    get_grade_for_lecture, GRADE_WEIGHTS
)
from app.services.registration import register_face_images

router = APIRouter()


@router.post("/register-face")
async def student_register_face(
    images         : list[UploadFile]  = File(...),
    current_student: Student           = Depends(get_current_student),
    db             : Session           = Depends(get_db),
):
    """Student self-registers their own face from the dashboard."""
    if len(images) < 3:
        raise HTTPException(status_code=400, detail="Minimum 3 images required")

    image_bytes_list = [await img.read() for img in images]
    stored = register_face_images(current_student.id, image_bytes_list, db)

    return {
        "message"           : "Face registered successfully",
        "student_id"        : current_student.id,
        "embeddings_stored" : stored,
    }


@router.get("/dashboard")
def student_dashboard(
    current_student: Student = Depends(get_current_student),
    db             : Session = Depends(get_db),
):
    enrollments = db.query(ModuleEnrollment).filter(
        ModuleEnrollment.student_id == current_student.id
    ).all()

    modules_data = []
    overall_grades = []

    for enrolment in enrollments:
        module = db.query(Module).filter(Module.id == enrolment.module_id).first()
        if not module or not module.is_active:
            continue

        grades = _get_student_grades_for_module(current_student.id, module.id, db)
        overall_grades.extend(grades)
        pct = calculate_attendance_percentage(grades)

        lecturer = db.query(User).filter(User.id == module.lecturer_id).first()

        modules_data.append({
            "module_id"     : module.id,
            "module_code"   : module.module_code,
            "module_name"   : module.module_name,
            "lecturer_name" : lecturer.full_name if lecturer else None,
            "attendance_pct": pct,
            "at_risk"       : pct < 80.0,
            "lectures_total": len(grades),
        })

    overall_pct = calculate_attendance_percentage(overall_grades)

    # Resolve programme, department, director
    programme  = db.query(Programme).filter(Programme.id == current_student.programme_id).first() if current_student.programme_id else None
    department = db.query(Department).filter(Department.id == programme.department_id).first() if programme else None
    director   = db.query(User).filter(User.id == programme.director_id).first() if programme and programme.director_id else None

    return {
        "student_id"      : current_student.id,
        "full_name"        : current_student.full_name,
        "student_number"   : current_student.student_number,
        "face_registered"  : current_student.face_registered,
        "admission_year"   : current_student.admission_year,
        "year_of_study"    : current_student.year_of_study,
        "programme_name"   : programme.name  if programme  else None,
        "department_name"  : department.name if department else None,
        "director_name"    : director.full_name if director else None,
        "overall_pct"      : overall_pct,
        "at_risk"          : overall_pct < 80.0,
        "modules"          : modules_data,
    }


@router.get("/attendance")
def my_full_attendance(
    current_student: Student = Depends(get_current_student),
    db             : Session = Depends(get_db),
):
    """Full lecture-by-lecture attendance history across all modules."""
    enrollments = db.query(ModuleEnrollment).filter(
        ModuleEnrollment.student_id == current_student.id
    ).all()

    history = []
    for enrolment in enrollments:
        module = db.query(Module).filter(Module.id == enrolment.module_id).first()
        if not module:
            continue

        lectures = db.query(ScheduledLecture).filter(
            ScheduledLecture.module_id    == module.id,
            ScheduledLecture.is_cancelled == False,
            ScheduledLecture.date         <= _date.today(),
        ).order_by(ScheduledLecture.date.desc()).all()

        for lecture in lectures:
            scans   = db.query(AttendanceScan).filter(
                AttendanceScan.lecture_id == lecture.id
            ).all()

            scan_records = []
            for scan in scans:
                records = db.query(AttendanceRecord).filter(
                    AttendanceRecord.scan_id    == scan.id,
                    AttendanceRecord.student_id == current_student.id,
                ).all()
                for r in records:
                    scan_records.append({
                        "scan_number": scan.scan_number,
                        "student_id" : r.student_id,
                        "confidence" : r.confidence,
                    })

            grade = get_grade_for_lecture(lecture.id, current_student.id, scan_records)

            history.append({
                "lecture_id"  : lecture.id,
                "module_code" : module.module_code,
                "module_name" : module.module_name,
                "date"        : lecture.date.isoformat(),
                "start_time"  : lecture.start_time.isoformat(),
                "room"        : lecture.room,
                "scan1"       : any(r["scan_number"] == 1 for r in scan_records),
                "scan2"       : any(r["scan_number"] == 2 for r in scan_records),
                "scan3"       : any(r["scan_number"] == 3 for r in scan_records),
                "grade"       : grade.value,
                "grade_weight": GRADE_WEIGHTS[grade],
            })

    return {
        "student_id"    : current_student.id,
        "full_name"     : current_student.full_name,
        "student_number": current_student.student_number,
        "total_lectures": len(history),
        "history"       : history,
    }


@router.get("/attendance/{module_id}")
def my_module_attendance(
    module_id      : str,
    current_student: Student = Depends(get_current_student),
    db             : Session = Depends(get_db),
):
    """Attendance for one specific module."""
    enrolment = db.query(ModuleEnrollment).filter(
        ModuleEnrollment.module_id  == module_id,
        ModuleEnrollment.student_id == current_student.id,
    ).first()
    if not enrolment:
        raise HTTPException(status_code=403, detail="Not enrolled in this module")

    module  = db.query(Module).filter(Module.id == module_id).first()
    grades  = _get_student_grades_for_module(current_student.id, module_id, db)
    pct     = calculate_attendance_percentage(grades)

    return {
        "module_code"   : module.module_code,
        "module_name"   : module.module_name,
        "attendance_pct": pct,
        "at_risk"       : pct < 80.0,
        "grade_breakdown": {g.value: grades.count(g) for g in AttendanceGrade},
    }


# ── Private helpers ───────────────────────────────────────────────────────

def _get_student_grades_for_module(
    student_id: str,
    module_id : str,
    db        : Session,
) -> list[AttendanceGrade]:
    """Return a list of grades — one per lecture — for a student in a module."""
    lectures = db.query(ScheduledLecture).filter(
        ScheduledLecture.module_id    == module_id,
        ScheduledLecture.is_cancelled == False,
        ScheduledLecture.date         <= _date.today(),
    ).all()

    grades = []
    for lecture in lectures:
        scans = db.query(AttendanceScan).filter(
            AttendanceScan.lecture_id == lecture.id
        ).all()

        scan_records = []
        for scan in scans:
            records = db.query(AttendanceRecord).filter(
                AttendanceRecord.scan_id    == scan.id,
                AttendanceRecord.student_id == student_id,
            ).all()
            for r in records:
                scan_records.append({
                    "scan_number": scan.scan_number,
                    "student_id" : r.student_id,
                })

        grade = get_grade_for_lecture(lecture.id, student_id, scan_records)
        grades.append(grade)

    return grades


@router.get("/modules")
def my_modules(
    current_student: Student = Depends(get_current_student),
    db             : Session = Depends(get_db),
):
    """All enrolled modules with full lecture timetable for the student."""
    enrollments = db.query(ModuleEnrollment).filter(
        ModuleEnrollment.student_id == current_student.id
    ).all()

    result = []
    today  = _date.today()

    for enrolment in enrollments:
        module = db.query(Module).filter(
            Module.id == enrolment.module_id,
            Module.is_active == True,
        ).first()
        if not module:
            continue

        lecturer = db.query(User).filter(User.id == module.lecturer_id).first()

        lectures = db.query(ScheduledLecture).filter(
            ScheduledLecture.module_id    == module.id,
            ScheduledLecture.is_cancelled == False,
        ).order_by(ScheduledLecture.date.asc()).all()

        result.append({
            "module_id"    : module.id,
            "module_code"  : module.module_code,
            "module_name"  : module.module_name,
            "semester"     : module.semester,
            "academic_year": module.academic_year,
            "lecturer_name": lecturer.full_name if lecturer else None,
            "lectures": [
                {
                    "id"        : l.id,
                    "date"      : l.date.isoformat(),
                    "start_time": l.start_time.isoformat(),
                    "end_time"  : l.end_time.isoformat(),
                    "room"      : l.room,
                    "is_future" : l.date > today,
                }
                for l in lectures
            ],
        })

    return result