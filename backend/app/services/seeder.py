"""
FaceAttend Institutional — Full Data Seeder
============================================
Creates a complete realistic dataset for testing:

INSTITUTION
  → University of Technological Ireland (UTI)
      → School of Computing & Digital Technologies
          → BSc Computer Science (Yr 1–4)
          → MSc Artificial Intelligence (Yr 1–2)
      → School of Engineering
          → BEng Electronic Engineering (Yr 1–4)

STAFF  (all passwords: Staff@1234, 2FA not yet set up)
  → 1 System Admin        admin@faceattend.ie      / Admin@1234
  → 1 Programme Director  director@uti.ie
  → 4 Lecturers           lecturer1–4@uti.ie

MODULES  (8 modules across 2 programmes)
  CS modules → lecturer1 / lecturer2
  AI modules → lecturer2 / lecturer3
  EE modules → lecturer4

STUDENTS (20 students across programmes — passwords = student number)
  10 × BSc CS  (cs_students)
   5 × MSc AI  (ai_students)
   5 × BEng EE (ee_students)

ENROLMENTS
  Every student enrolled in all modules of their programme

LECTURES
  3 lectures per module (past dates so grading can be tested)

HOW TO USE
----------
Replace backend/app/services/seeder.py with this file, then:

  uvicorn app.main:app --reload

The seeder runs automatically on startup via on_startup() in main.py.
To force a re-seed, delete faceattend.db and restart.

LOGIN CREDENTIALS
-----------------
admin@faceattend.ie          Admin@1234      → System Admin
director@uti.ie              Staff@1234      → Programme Director (BSc CS)
lecturer1@uti.ie             Staff@1234      → Lecturer (CS modules)
lecturer2@uti.ie             Staff@1234      → Lecturer (CS + AI modules)
lecturer3@uti.ie             Staff@1234      → Lecturer (AI modules)
lecturer4@uti.ie             Staff@1234      → Lecturer (EE modules)

Students (password = student number, e.g. STU20240001):
  stu20240001@uti.ie … stu20240020@uti.ie

Note: First login triggers 2FA setup via Google Authenticator.
"""

import uuid
from datetime import datetime, date, time, timedelta
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user       import User, Student, UserRole
from app.models.academic   import (
    University, Department, Programme,
    Module, ModuleEnrollment,
)
from app.models.attendance import ScheduledLecture


# ─────────────────────────────────────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _uid() -> str:
    return str(uuid.uuid4())


def _lecture_dt(d: date, t: time) -> datetime:
    return datetime.combine(d, t)


def _scan_windows(start: datetime, end: datetime):
    """
    Auto-calculate three scan windows from lecture start/end.
    Scan 1: start → start+15min
    Scan 2: midpoint ±10min
    Scan 3: end-15min → end
    """
    duration = end - start
    midpoint = start + duration / 2
    return {
        "scan1_opens_at"  : start,
        "scan1_closes_at" : start + timedelta(minutes=15),
        "scan2_opens_at"  : midpoint - timedelta(minutes=10),
        "scan2_closes_at" : midpoint + timedelta(minutes=10),
        "scan3_opens_at"  : end - timedelta(minutes=15),
        "scan3_closes_at" : end,
    }


def _already_seeded(db: Session) -> bool:
    if db.query(User).filter(User.email == "director@uti.ie").first():
        return True
    return db.query(University).filter(
        University.name.in_(
            (
                "Griffith College Limerick",
                "University of Technological Ireland",
            )
        )
    ).first() is not None


# ─────────────────────────────────────────────────────────────────────────────
#  MAIN SEEDER
# ─────────────────────────────────────────────────────────────────────────────

def seed_default_admin(db: Session):
    """Entry point called from main.py on startup."""
    _ensure_admin(db)
    if _already_seeded(db):
        print(" Seed data already present — skipping full seed")
        return
    _seed_all(db)


def _ensure_admin(db: Session):
    if db.query(User).filter(User.email == "admin@faceattend.ie").first():
        return
    admin = User(
        id            = _uid(),
        email         = "admin@faceattend.ie",
        full_name     = "System Administrator",
        password_hash = hash_password("Admin@1234"),
        role          = UserRole.SYSTEM_ADMIN,
        totp_enabled  = False,
        is_active     = True,
    )
    db.add(admin)
    db.commit()
    print("Admin seeded → admin@faceattend.ie / Admin@1234")


def _seed_all(db: Session):
    print("Seeding full institutional dataset...")

    # ── 1. UNIVERSITY ──────────────────────────────────────────────────────
    uni = University(
        id      = _uid(),
        name    = "Griffith College Limerick",
        country = "Ireland",
    )
    db.add(uni)
    db.flush()

    # ── 2. DEPARTMENTS ─────────────────────────────────────────────────────
    dept_cs = Department(
        id            = _uid(),
        name          = "School of Computing & Digital Technologies",
        university_id = uni.id,
    )
    dept_eng = Department(
        id            = _uid(),
        name          = "School of Engineering",
        university_id = uni.id,
    )
    db.add_all([dept_cs, dept_eng])
    db.flush()

    # ── 3. STAFF USERS ─────────────────────────────────────────────────────
    staff_pw = hash_password("Staff@1234")

    director = User(
        id            = _uid(),
        email         = "director@uti.ie",
        full_name     = "Dr. Aoife Brennan",
        password_hash = staff_pw,
        role          = UserRole.PROGRAMME_DIRECTOR,
        department_id = dept_cs.id,
        totp_enabled  = False,
        is_active     = True,
    )
    lec1 = User(
        id            = _uid(),
        email         = "lecturer1@uti.ie",
        full_name     = "Dr. Ciarán Murphy",
        password_hash = staff_pw,
        role          = UserRole.LECTURER,
        department_id = dept_cs.id,
        totp_enabled  = False,
        is_active     = True,
    )
    lec2 = User(
        id            = _uid(),
        email         = "lecturer2@uti.ie",
        full_name     = "Dr. Sinéad O'Sullivan",
        password_hash = staff_pw,
        role          = UserRole.LECTURER,
        department_id = dept_cs.id,
        totp_enabled  = False,
        is_active     = True,
    )
    lec3 = User(
        id            = _uid(),
        email         = "lecturer3@uti.ie",
        full_name     = "Prof. Declan Walsh",
        password_hash = staff_pw,
        role          = UserRole.LECTURER,
        department_id = dept_cs.id,
        totp_enabled  = False,
        is_active     = True,
    )
    lec4 = User(
        id            = _uid(),
        email         = "lecturer4@uti.ie",
        full_name     = "Dr. Fionnuala Kelly",
        password_hash = staff_pw,
        role          = UserRole.LECTURER,
        department_id = dept_eng.id,
        totp_enabled  = False,
        is_active     = True,
    )
    db.add_all([director, lec1, lec2, lec3, lec4])
    db.flush()

    # ── 4. PROGRAMMES ──────────────────────────────────────────────────────
    prog_cs = Programme(
        id            = _uid(),
        name          = "BSc Computer Science",
        department_id = dept_cs.id,
        director_id   = director.id,
        is_active     = True,
    )
    prog_ai = Programme(
        id            = _uid(),
        name          = "MSc Artificial Intelligence",
        department_id = dept_cs.id,
        director_id   = director.id,
        is_active     = True,
    )
    prog_ee = Programme(
        id            = _uid(),
        name          = "BEng Electronic Engineering",
        department_id = dept_eng.id,
        director_id   = None,
        is_active     = True,
    )
    db.add_all([prog_cs, prog_ai, prog_ee])
    db.flush()

    # ── 5. MODULES ─────────────────────────────────────────────────────────
    YEAR = "2024/2025"

    # BSc CS modules (semester 1)
    mod_alg = Module(id=_uid(), module_code="CS401", module_name="Algorithms & Data Structures",
                     programme_id=prog_cs.id, lecturer_id=lec1.id, academic_year=YEAR, semester="1")
    mod_ml  = Module(id=_uid(), module_code="CS402", module_name="Machine Learning Fundamentals",
                     programme_id=prog_cs.id, lecturer_id=lec2.id, academic_year=YEAR, semester="1")
    mod_web = Module(id=_uid(), module_code="CS403", module_name="Full Stack Web Development",
                     programme_id=prog_cs.id, lecturer_id=lec1.id, academic_year=YEAR, semester="1")
    mod_db  = Module(id=_uid(), module_code="CS404", module_name="Database Systems & Design",
                     programme_id=prog_cs.id, lecturer_id=lec2.id, academic_year=YEAR, semester="2")

    # MSc AI modules (semester 1)
    mod_dl  = Module(id=_uid(), module_code="AI501", module_name="Deep Learning & Neural Networks",
                     programme_id=prog_ai.id, lecturer_id=lec3.id, academic_year=YEAR, semester="1")
    mod_cv  = Module(id=_uid(), module_code="AI502", module_name="Computer Vision",
                     programme_id=prog_ai.id, lecturer_id=lec2.id, academic_year=YEAR, semester="1")
    mod_nlp = Module(id=_uid(), module_code="AI503", module_name="Natural Language Processing",
                     programme_id=prog_ai.id, lecturer_id=lec3.id, academic_year=YEAR, semester="2")

    # BEng EE modules
    mod_emb = Module(id=_uid(), module_code="EE401", module_name="Embedded Systems",
                     programme_id=prog_ee.id, lecturer_id=lec4.id, academic_year=YEAR, semester="1")
    mod_sig = Module(id=_uid(), module_code="EE402", module_name="Signal Processing",
                     programme_id=prog_ee.id, lecturer_id=lec4.id, academic_year=YEAR, semester="1")

    cs_modules  = [mod_alg, mod_ml, mod_web, mod_db]
    ai_modules  = [mod_dl, mod_cv, mod_nlp]
    ee_modules  = [mod_emb, mod_sig]
    all_modules = cs_modules + ai_modules + ee_modules

    db.add_all(all_modules)
    db.flush()

    # ── 6. STUDENTS ────────────────────────────────────────────────────────
    def make_student(num: str, name: str, email: str, prog_id: str, year: int) -> Student:
        return Student(
            id              = _uid(),
            student_number  = num,
            full_name       = name,
            email           = email,
            password_hash   = hash_password(num),
            programme_id    = prog_id,
            year_of_study   = year,
            face_registered = False,
            is_active       = True,
        )

    # BSc CS students
    cs_students = [
        make_student("STU20240001", "Oisín Fitzgerald",  "stu20240001@uti.ie", prog_cs.id, 3),
        make_student("STU20240002", "Caoimhe Doherty",   "stu20240002@uti.ie", prog_cs.id, 3),
        make_student("STU20240003", "Rían O'Brien",      "stu20240003@uti.ie", prog_cs.id, 3),
        make_student("STU20240004", "Saoirse McCarthy",  "stu20240004@uti.ie", prog_cs.id, 3),
        make_student("STU20240005", "Tadhg Gallagher",   "stu20240005@uti.ie", prog_cs.id, 2),
        make_student("STU20240006", "Niamh Brennan",     "stu20240006@uti.ie", prog_cs.id, 2),
        make_student("STU20240007", "Cormac Ryan",       "stu20240007@uti.ie", prog_cs.id, 2),
        make_student("STU20240008", "Aoibhinn Quinn",    "stu20240008@uti.ie", prog_cs.id, 1),
        make_student("STU20240009", "Fionn Doyle",       "stu20240009@uti.ie", prog_cs.id, 1),
        make_student("STU20240010", "Éabha Nolan",       "stu20240010@uti.ie", prog_cs.id, 1),
    ]

    # MSc AI students
    ai_students = [
        make_student("STU20240011", "Adaeze Okonkwo",    "stu20240011@uti.ie", prog_ai.id, 1),
        make_student("STU20240012", "Kwame Asante",      "stu20240012@uti.ie", prog_ai.id, 1),
        make_student("STU20240013", "Priya Nair",        "stu20240013@uti.ie", prog_ai.id, 1),
        make_student("STU20240014", "Luca Rossi",        "stu20240014@uti.ie", prog_ai.id, 1),
        make_student("STU20240015", "Sofia Andersson",   "stu20240015@uti.ie", prog_ai.id, 2),
    ]

    # BEng EE students
    ee_students = [
        make_student("STU20240016", "Darragh Connolly",  "stu20240016@uti.ie", prog_ee.id, 2),
        make_student("STU20240017", "Mairéad Burke",     "stu20240017@uti.ie", prog_ee.id, 2),
        make_student("STU20240018", "Seán Higgins",      "stu20240018@uti.ie", prog_ee.id, 3),
        make_student("STU20240019", "Ciara Walsh",       "stu20240019@uti.ie", prog_ee.id, 3),
        make_student("STU20240020", "Pádraig Ó'Neill",   "stu20240020@uti.ie", prog_ee.id, 1),
    ]

    all_students = cs_students + ai_students + ee_students
    db.add_all(all_students)
    db.flush()

    # ── 7. ENROLMENTS ──────────────────────────────────────────────────────
    enrolments = []

    for student in cs_students:
        for mod in cs_modules:
            enrolments.append(ModuleEnrollment(
                id=_uid(), module_id=mod.id, student_id=student.id
            ))

    for student in ai_students:
        for mod in ai_modules:
            enrolments.append(ModuleEnrollment(
                id=_uid(), module_id=mod.id, student_id=student.id
            ))

    for student in ee_students:
        for mod in ee_modules:
            enrolments.append(ModuleEnrollment(
                id=_uid(), module_id=mod.id, student_id=student.id
            ))

    db.add_all(enrolments)
    db.flush()

    # ── 8. LECTURES ────────────────────────────────────────────────────────
    # 3 past lectures per module so reports and grading have data to show
    # Lecture times spread across Mon/Tue/Wed/Thu mornings

    today = date.today()

    def past_monday(weeks_ago: int) -> date:
        """Get the Monday from N weeks ago."""
        d = today - timedelta(days=today.weekday())  # this week's Monday
        return d - timedelta(weeks=weeks_ago)

    def make_lectures(mod: Module, day_offset: int, start_hour: int, end_hour: int, room: str):
        lectures = []
        for week in [3, 2, 1]:
            lecture_date = past_monday(week) + timedelta(days=day_offset)
            start_dt     = datetime(lecture_date.year, lecture_date.month, lecture_date.day, start_hour, 0, 0)
            end_dt       = datetime(lecture_date.year, lecture_date.month, lecture_date.day, end_hour,   0, 0)
            duration     = end_dt - start_dt
            midpoint     = start_dt + duration / 2

            lectures.append(ScheduledLecture(
                id              = _uid(),
                module_id       = mod.id,
                date            = lecture_date,
                start_time      = start_dt.time(),
                end_time        = end_dt.time(),
                room            = room,
                scan1_opens_at  = start_dt,
                scan1_closes_at = start_dt  + timedelta(minutes=15),
                scan2_opens_at  = midpoint  - timedelta(minutes=10),
                scan2_closes_at = midpoint  + timedelta(minutes=10),
                scan3_opens_at  = end_dt    - timedelta(minutes=15),
                scan3_closes_at = end_dt,
                is_recurring    = True,
                recur_day       = day_offset,
                is_cancelled    = False,
            ))
        return lectures

    all_lectures = []

    # CS modules — Monday & Tuesday mornings, Block A rooms
    all_lectures += make_lectures(mod_alg, day_offset=0, start_hour=9,  end_hour=11, room="A101")
    all_lectures += make_lectures(mod_ml,  day_offset=0, start_hour=12, end_hour=14, room="A102")
    all_lectures += make_lectures(mod_web, day_offset=1, start_hour=9,  end_hour=11, room="A201")
    all_lectures += make_lectures(mod_db,  day_offset=1, start_hour=14, end_hour=16, room="A202")

    # AI modules — Wednesday mornings, Block B rooms
    all_lectures += make_lectures(mod_dl,  day_offset=2, start_hour=9,  end_hour=11, room="B101")
    all_lectures += make_lectures(mod_cv,  day_offset=2, start_hour=12, end_hour=14, room="B102")
    all_lectures += make_lectures(mod_nlp, day_offset=2, start_hour=14, end_hour=16, room="B201")

    # EE modules — Thursday mornings, Engineering Block
    all_lectures += make_lectures(mod_emb, day_offset=3, start_hour=9,  end_hour=11, room="ENG-101")
    all_lectures += make_lectures(mod_sig, day_offset=3, start_hour=12, end_hour=14, room="ENG-102")

    db.add_all(all_lectures)
    db.commit()

    # ── SUMMARY ────────────────────────────────────────────────────────────
    print("=" * 56)
    print("SEED COMPLETE")
    print("=" * 56)
    print(f"  University  : University of Technological Ireland")
    print(f"  Departments : 2")
    print(f"  Programmes  : 3  (BSc CS · MSc AI · BEng EE)")
    print(f"  Modules     : {len(all_modules)}  (CS×4 · AI×3 · EE×2)")
    print(f"  Lectures    : {len(all_lectures)}  (3 per module, past dates)")
    print(f"  Students    : {len(all_students)}  (CS×10 · AI×5 · EE×5)")
    print(f"  Enrolments  : {len(enrolments)}")
    print()
    print("  STAFF LOGINS (password: Staff@1234)")
    print("  ─────────────────────────────────────")
    print("  director@uti.ie   → Programme Director")
    print("  lecturer1@uti.ie  → Dr. Ciarán Murphy  (CS401, CS403)")
    print("  lecturer2@uti.ie  → Dr. Sinéad O'Sullivan (CS402, CS404, AI502)")
    print("  lecturer3@uti.ie  → Prof. Declan Walsh  (AI501, AI503)")
    print("  lecturer4@uti.ie  → Dr. Fionnuala Kelly (EE401, EE402)")
    print()
    print("  STUDENT LOGINS (password = student number)")
    print("  ─────────────────────────────────────────────")
    print("  stu20240001@uti.ie … stu20240020@uti.ie")
    print("  e.g. email: stu20240001@uti.ie  pw: STU20240001")
    print("=" * 56)