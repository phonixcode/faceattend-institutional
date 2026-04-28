"""
Kiosk routes — scan window management and multi-face check-in.
These endpoints are called by the kiosk display screen.
The checkin endpoint is public — no auth needed on the kiosk screen itself.
Scan open/close requires lecturer auth.
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.dependencies import require_lecturer
from app.models.user import User, Student
from app.models.academic import Module, ModuleEnrollment
from app.models.attendance import (
    ScheduledLecture, AttendanceScan, AttendanceRecord,
    FaceEmbedding, RecognitionLog, ScanStatus, AttendanceGrade
)
from app.services.recognition import recognise_faces, decrypt_embedding
from app.services.attendance_grader import calculate_grade, get_grade_for_lecture, GRADE_WEIGHTS
from app.services.email_service import send_lecture_summary
from app.schemas.attendance import CheckinResponse, CheckinResult
import uuid

router = APIRouter()


# ═══════════════════════════════════════════
#  SCAN WINDOW MANAGEMENT
# ═══════════════════════════════════════════

@router.post("/open")
def open_scan(
    lecture_id  : str  = Form(...),
    scan_number : int  = Form(...),
    current_user: User = Depends(require_lecturer),
    db          : Session = Depends(get_db),
):
    """
    Manually open a scan window for a lecture.
    Creates the AttendanceScan record and sets status to OPEN.
    Idempotent — returns existing scan if already open.
    """
    lecture = _get_lecture_or_404(lecture_id, db)
    _verify_lecturer_owns_lecture(lecture, current_user.id, db)

    if scan_number not in (1, 2, 3):
        raise HTTPException(status_code=400, detail="scan_number must be 1, 2, or 3")

    # Return existing open scan if already opened
    existing = db.query(AttendanceScan).filter(
        AttendanceScan.lecture_id  == lecture_id,
        AttendanceScan.scan_number == scan_number,
    ).first()

    if existing:
        if existing.status == ScanStatus.OPEN:
            return {"message": "Scan already open", "scan": _scan_to_dict(existing)}
        if existing.status == ScanStatus.CLOSED:
            raise HTTPException(status_code=400, detail="This scan window has already been closed")

    scan = AttendanceScan(
        id         = str(uuid.uuid4()),
        lecture_id = lecture_id,
        scan_number= scan_number,
        status     = ScanStatus.OPEN,
        opened_by  = current_user.id,
        opened_at  = datetime.utcnow(),
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)

    return {
        "message": f"Scan {scan_number} opened successfully",
        "scan"   : _scan_to_dict(scan),
    }


@router.post("/close/{scan_id}")
def close_scan(
    scan_id     : str,
    background  : BackgroundTasks,
    current_user: User    = Depends(require_lecturer),
    db          : Session = Depends(get_db),
):
    """
    Close a scan window.
    If scan 3 is being closed, triggers email summary as a background task.
    """
    scan = _get_scan_or_404(scan_id, db)
    lecture = _get_lecture_or_404(scan.lecture_id, db)
    _verify_lecturer_owns_lecture(lecture, current_user.id, db)

    if scan.status != ScanStatus.OPEN:
        raise HTTPException(status_code=400, detail="Scan is not currently open")

    scan.status   = ScanStatus.CLOSED
    scan.closed_at= datetime.utcnow()
    db.commit()

    # Trigger email summary when scan 3 closes — lecture is complete
    if scan.scan_number == 3:
        background.add_task(
            _send_lecture_email_summary,
            lecture_id  = lecture.id,
            lecturer_id = current_user.id,
            db_session  = db,
        )

    return {
        "message": f"Scan {scan.scan_number} closed",
        "scan"   : _scan_to_dict(scan),
    }


@router.get("/lecture/{lecture_id}/status")
def get_lecture_scan_status(
    lecture_id: str,
    db        : Session = Depends(get_db),
):
    """
    Public endpoint — kiosk polls this to know which scan is currently open.
    Returns active scan info or null if no scan is open.
    """
    lecture = _get_lecture_or_404(lecture_id, db)

    open_scan = db.query(AttendanceScan).filter(
        AttendanceScan.lecture_id == lecture_id,
        AttendanceScan.status     == ScanStatus.OPEN,
    ).first()

    all_scans = db.query(AttendanceScan).filter(
        AttendanceScan.lecture_id == lecture_id,
    ).order_by(AttendanceScan.scan_number).all()

    return {
        "lecture_id" : lecture_id,
        "active_scan": _scan_to_dict(open_scan) if open_scan else None,
        "all_scans"  : [_scan_to_dict(s) for s in all_scans],
        "lecture"    : {
            "date"      : lecture.date.isoformat(),
            "start_time": lecture.start_time.isoformat(),
            "end_time"  : lecture.end_time.isoformat(),
            "room"      : lecture.room,
        },
    }


# ═══════════════════════════════════════════
#  MULTI-FACE CHECK-IN
# ═══════════════════════════════════════════

@router.post("/{scan_id}/checkin", response_model=CheckinResponse)
async def checkin(
    scan_id: str,
    images : list[UploadFile] = File(...),
    db     : Session          = Depends(get_db),
):
    """
    Multi-face check-in endpoint — public, called by kiosk.
    Accepts multiple face crop images from the kiosk camera frame.
    Runs FaceNet recognition on each crop against enrolled students.
    Marks attendance for all matched students in one request.
    """
    scan = _get_scan_or_404(scan_id, db)

    if scan.status != ScanStatus.OPEN:
        raise HTTPException(status_code=400, detail="This scan window is not open")

    lecture = _get_lecture_or_404(scan.lecture_id, db)

    # Load all enrolled student embeddings for this module
    enrolled_ids = [
        e.student_id for e in
        db.query(ModuleEnrollment).filter(
            ModuleEnrollment.module_id == lecture.module_id
        ).all()
    ]

    if not enrolled_ids:
        raise HTTPException(status_code=400, detail="No students enrolled in this module")

    embeddings = db.query(FaceEmbedding).filter(
        FaceEmbedding.student_id.in_(enrolled_ids)
    ).all()

    stored_embeddings = [
        {"student_id": e.student_id, "embedding": e.embedding}
        for e in embeddings
    ]

    # Read all uploaded face crops
    image_bytes_list = [await img.read() for img in images]
    faces_detected   = len(image_bytes_list)

    # Run recognition
    recognition_results = recognise_faces(image_bytes_list, stored_embeddings)

    # Process results — mark attendance, log everything
    results        = []
    faces_recognised = 0
    already_marked = {
        r.student_id for r in
        db.query(AttendanceRecord).filter(
            AttendanceRecord.scan_id == scan_id
        ).all()
    }

    for result in recognition_results:
        if result["status"] == "MATCH":
            student_id = result["student_id"]
            confidence = result["confidence"]
            needs_review = confidence < 40.0

            if student_id not in already_marked:
                record = AttendanceRecord(
                    id            = str(uuid.uuid4()),
                    scan_id       = scan_id,
                    student_id    = student_id,
                    confidence    = confidence,
                    needs_review  = needs_review,
                    faces_in_frame= faces_detected,
                )
                db.add(record)
                already_marked.add(student_id)
                faces_recognised += 1

            student = db.query(Student).filter(Student.id == student_id).first()
            results.append(CheckinResult(
                status      = "MATCH",
                student_id  = student_id,
                full_name   = student.full_name if student else "Unknown",
                confidence  = confidence,
                needs_review= needs_review,
            ))

            # Log recognition event
            _log_recognition(scan_id, student_id, "MATCH", confidence, result["distance"], db)

        elif result["status"] == "UNKNOWN":
            results.append(CheckinResult(
                status    = "UNKNOWN",
                student_id= None,
                full_name = None,
                confidence= 0.0,
            ))
            _log_recognition(scan_id, None, "UNKNOWN", 0.0, result["distance"], db)

        else:
            results.append(CheckinResult(
                status    = "ERROR",
                student_id= None,
                full_name = None,
                confidence= 0.0,
            ))

    db.commit()

    return CheckinResponse(
        scan_id         = scan_id,
        faces_detected  = faces_detected,
        faces_recognised= faces_recognised,
        results         = results,
    )


# ═══════════════════════════════════════════
#  LIVE ATTENDANCE VIEW
# ═══════════════════════════════════════════

@router.get("/{scan_id}/attendance")
def get_scan_attendance(
    scan_id     : str,
    current_user: User    = Depends(require_lecturer),
    db          : Session = Depends(get_db),
):
    """Live attendance list for a specific scan window."""
    scan    = _get_scan_or_404(scan_id, db)
    records = db.query(AttendanceRecord).filter(
        AttendanceRecord.scan_id == scan_id
    ).order_by(AttendanceRecord.marked_at.desc()).all()

    result = []
    for r in records:
        student = db.query(Student).filter(Student.id == r.student_id).first()
        result.append({
            "student_id"    : r.student_id,
            "full_name"     : student.full_name if student else "Unknown",
            "student_number": student.student_number if student else "",
            "confidence"    : r.confidence,
            "needs_review"  : r.needs_review,
            "marked_at"     : r.marked_at.isoformat(),
        })

    return {
        "scan_id"    : scan_id,
        "scan_number": scan.scan_number,
        "status"     : scan.status.value,
        "total"      : len(result),
        "records"    : result,
    }


@router.get("/lecture/{lecture_id}/summary")
def get_lecture_summary(
    lecture_id  : str,
    current_user: User    = Depends(require_lecturer),
    db          : Session = Depends(get_db),
):
    """
    Three-scan grade summary for a complete lecture.
    Shows each student's presence per scan and final grade.
    """
    lecture = _get_lecture_or_404(lecture_id, db)
    _verify_lecturer_owns_lecture(lecture, current_user.id, db)

    scans = db.query(AttendanceScan).filter(
        AttendanceScan.lecture_id == lecture_id
    ).all()

    scan_map = {s.scan_number: s.id for s in scans}

    # All records across all scans for this lecture
    all_records = []
    for scan in scans:
        records = db.query(AttendanceRecord).filter(
            AttendanceRecord.scan_id == scan.id
        ).all()
        for r in records:
            all_records.append({
                "scan_number": scan.scan_number,
                "student_id" : r.student_id,
                "confidence" : r.confidence,
                "needs_review": r.needs_review,
            })

    # All enrolled students
    enrolled = db.query(ModuleEnrollment).filter(
        ModuleEnrollment.module_id == lecture.module_id
    ).all()

    summary = []
    for enrolment in enrolled:
        student = db.query(Student).filter(Student.id == enrolment.student_id).first()
        if not student:
            continue

        scan1 = any(r["scan_number"] == 1 and r["student_id"] == student.id for r in all_records)
        scan2 = any(r["scan_number"] == 2 and r["student_id"] == student.id for r in all_records)
        scan3 = any(r["scan_number"] == 3 and r["student_id"] == student.id for r in all_records)
        grade = calculate_grade(scan1, scan2, scan3)

        summary.append({
            "student_id"    : student.id,
            "full_name"     : student.full_name,
            "student_number": student.student_number,
            "scan1_present" : scan1,
            "scan2_present" : scan2,
            "scan3_present" : scan3,
            "grade"         : grade.value,
            "grade_weight"  : GRADE_WEIGHTS[grade],
        })

    total_enrolled  = len(summary)
    full_count      = sum(1 for s in summary if s["grade"] == "FULL")
    partial_count   = sum(1 for s in summary if s["grade"] == "PARTIAL")
    absent_count    = sum(1 for s in summary if s["grade"] == "ABSENT")
    avg_rate        = (
        sum(s["grade_weight"] for s in summary) / total_enrolled * 100
        if total_enrolled > 0 else 0
    )

    return {
        "lecture_id"    : lecture_id,
        "date"          : lecture.date.isoformat(),
        "room"          : lecture.room,
        "total_enrolled": total_enrolled,
        "full_count"    : full_count,
        "partial_count" : partial_count,
        "absent_count"  : absent_count,
        "avg_rate"      : round(avg_rate, 1),
        "students"      : summary,
    }


# ═══════════════════════════════════════════
#  REPORTS
# ═══════════════════════════════════════════

@router.get("/module/{module_id}/report")
def module_attendance_report(
    module_id   : str,
    current_user: User    = Depends(require_lecturer),
    db          : Session = Depends(get_db),
):
    """
    Full module attendance report.
    Per-student attendance percentage across all lectures.
    """
    from app.services.attendance_grader import calculate_attendance_percentage

    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    lectures = db.query(ScheduledLecture).filter(
        ScheduledLecture.module_id    == module_id,
        ScheduledLecture.is_cancelled == False,
    ).all()

    enrolled = db.query(ModuleEnrollment).filter(
        ModuleEnrollment.module_id == module_id
    ).all()

    students_report = []
    for enrolment in enrolled:
        student = db.query(Student).filter(Student.id == enrolment.student_id).first()
        if not student:
            continue

        grades = []
        for lecture in lectures:
            scans = db.query(AttendanceScan).filter(
                AttendanceScan.lecture_id == lecture.id
            ).all()

            scan_records = []
            for scan in scans:
                records = db.query(AttendanceRecord).filter(
                    AttendanceRecord.scan_id    == scan.id,
                    AttendanceRecord.student_id == student.id,
                ).all()
                for r in records:
                    scan_records.append({
                        "scan_number": scan.scan_number,
                        "student_id" : r.student_id,
                    })

            grade = get_grade_for_lecture(lecture.id, student.id, scan_records)
            grades.append(grade)

        attendance_pct = calculate_attendance_percentage(grades)
        at_risk        = attendance_pct < 80.0

        students_report.append({
            "student_id"      : student.id,
            "student_number"  : student.student_number,
            "full_name"       : student.full_name,
            "attendance_pct"  : attendance_pct,
            "at_risk"         : at_risk,
            "lectures_total"  : len(lectures),
            "grade_breakdown" : {g.value: grades.count(g) for g in AttendanceGrade},
        })

    return {
        "module_id"   : module_id,
        "module_code" : module.module_code,
        "module_name" : module.module_name,
        "total_lectures": len(lectures),
        "total_students": len(students_report),
        "at_risk_count": sum(1 for s in students_report if s["at_risk"]),
        "students"    : sorted(students_report, key=lambda x: x["attendance_pct"]),
    }


@router.get("/module/{module_id}/report/export")
def export_module_report(
    module_id   : str,
    current_user: User    = Depends(require_lecturer),
    db          : Session = Depends(get_db),
):
    """Download attendance report as CSV."""
    import csv
    import io
    from fastapi.responses import StreamingResponse

    report = module_attendance_report(module_id, current_user, db)

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        "student_number", "full_name", "attendance_pct",
        "at_risk", "lectures_total",
        "FULL", "PARTIAL", "LEFT_EARLY", "ARRIVED_LATE", "SUSPICIOUS", "ABSENT"
    ])
    writer.writeheader()

    for s in report["students"]:
        writer.writerow({
            "student_number": s["student_number"],
            "full_name"     : s["full_name"],
            "attendance_pct": s["attendance_pct"],
            "at_risk"       : s["at_risk"],
            "lectures_total": s["lectures_total"],
            **s["grade_breakdown"],
        })

    output.seek(0)
    filename = f"{report['module_code']}_attendance_report.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ═══════════════════════════════════════════
#  PRIVATE HELPERS
# ═══════════════════════════════════════════

def _get_lecture_or_404(lecture_id: str, db: Session) -> ScheduledLecture:
    lecture = db.query(ScheduledLecture).filter(
        ScheduledLecture.id == lecture_id
    ).first()
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")
    return lecture


def _get_scan_or_404(scan_id: str, db: Session) -> AttendanceScan:
    scan = db.query(AttendanceScan).filter(AttendanceScan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan


def _verify_lecturer_owns_lecture(lecture: ScheduledLecture, user_id: str, db: Session):
    from app.models.user import UserRole
    module = db.query(Module).filter(Module.id == lecture.module_id).first()
    user   = db.query(User).filter(User.id == user_id).first()
    if user and user.role == UserRole.SYSTEM_ADMIN:
        return
    if not module or module.lecturer_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorised for this lecture")


def _scan_to_dict(scan: AttendanceScan) -> dict:
    return {
        "id"         : scan.id,
        "scan_number": scan.scan_number,
        "status"     : scan.status.value,
        "opened_at"  : scan.opened_at.isoformat() if scan.opened_at else None,
        "closed_at"  : scan.closed_at.isoformat() if scan.closed_at else None,
    }


def _log_recognition(
    scan_id   : str,
    student_id: str | None,
    result    : str,
    confidence: float,
    distance  : float,
    db        : Session,
):
    log = RecognitionLog(
        id        = str(uuid.uuid4()),
        scan_id   = scan_id,
        student_id= student_id,
        result    = result,
        confidence= confidence,
        distance  = distance,
    )
    db.add(log)


def _send_lecture_email_summary(lecture_id: str, lecturer_id: str, db_session: Session):
    """Background task — sends email summary when scan 3 closes."""
    try:
        from app.models.user import User
        lecturer = db_session.query(User).filter(User.id == lecturer_id).first()
        if not lecturer:
            return

        summary = get_lecture_summary.__wrapped__(lecture_id, lecturer, db_session) \
            if hasattr(get_lecture_summary, "__wrapped__") \
            else None

        if summary:
            send_lecture_summary(
                to_email     = lecturer.email,
                lecturer_name= lecturer.full_name,
                summary      = summary,
            )
    except Exception as e:
        print(f"Email summary error: {e}")