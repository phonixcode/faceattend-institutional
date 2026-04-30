"""
FaceAttend Institutional — Minimal Test Seeder
===============================================
INSTITUTION
  → Griffith College Limerick
      → School of Computing & Digital Technologies
          → BSc Computer Science (Yr 1–4, modules tagged by year)
      → School of Engineering
          → BEng Electronic Engineering (Yr 1–2)

STAFF
  admin@faceattend.ie        Admin@1234      → System Admin
  director@uti.ie            Staff@1234      → Programme Director
  lecturer1@uti.ie           Staff@1234      → Lecturer (CS modules)
  lecturer2@uti.ie           Staff@1234      → Lecturer (EE modules)

MODULES (year_of_study tagged for auto-enroll)
  CS401  Algorithms & DS           BSc CS  Year 1
  CS402  Machine Learning          BSc CS  Year 2
  EE401  Embedded Systems          BEng EE Year 1
  EE402  Signal Processing         BEng EE Year 2

STUDENTS (2 per cohort × 2 intakes × 2 programmes = 8 students)
  2026 intake → CS: STU20260001, STU20260002   EE: STU20260003, STU20260004
  2027 intake → CS: STU20270001, STU20270002   EE: STU20270003, STU20270004

  password = student number  (e.g. STU20260001)

LECTURES: 2 past lectures per module
"""

import uuid
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user       import User, Student, UserRole
from app.models.academic   import (
    University, Department, Programme,
    Module, ModuleEnrollment,
)
from app.models.attendance import ScheduledLecture


def _uid() -> str:
    return str(uuid.uuid4())


def _already_seeded(db: Session) -> bool:
    return db.query(User).filter(User.email == "director@uti.ie").first() is not None


def seed_default_admin(db: Session):
    _ensure_admin(db)
    if _already_seeded(db):
        print("Seed data already present — skipping full seed")
        return
    _seed_all(db)


def _ensure_admin(db: Session):
    if db.query(User).filter(User.email == "admin@faceattend.ie").first():
        return
    db.add(User(
        id            = _uid(),
        email         = "admin@faceattend.ie",
        full_name     = "System Administrator",
        password_hash = hash_password("Admin@1234"),
        role          = UserRole.SYSTEM_ADMIN,
        totp_enabled  = False,
        is_active     = True,
    ))
    db.commit()
    print("Admin seeded → admin@faceattend.ie / Admin@1234")


def _seed_all(db: Session):
    print("Seeding minimal dataset...")

    # ── 1. UNIVERSITY ─────────────────────────────────────────────────────────
    uni = University(id=_uid(), name="Griffith College Limerick", country="Ireland")
    db.add(uni)
    db.flush()

    # ── 2. DEPARTMENTS ────────────────────────────────────────────────────────
    dept_cs = Department(id=_uid(), name="School of Computing & Digital Technologies", university_id=uni.id)
    dept_eng = Department(id=_uid(), name="School of Engineering", university_id=uni.id)
    db.add_all([dept_cs, dept_eng])
    db.flush()

    # ── 3. STAFF ──────────────────────────────────────────────────────────────
    pw = hash_password("Staff@1234")

    director = User(id=_uid(), email="director@uti.ie", full_name="Dr. Aoife Brennan",
                    password_hash=pw, role=UserRole.PROGRAMME_DIRECTOR,
                    department_id=dept_cs.id, totp_enabled=False, is_active=True)
    lec1 = User(id=_uid(), email="lecturer1@uti.ie", full_name="Dr. Ciarán Murphy",
                password_hash=pw, role=UserRole.LECTURER,
                department_id=dept_cs.id, totp_enabled=False, is_active=True)
    lec2 = User(id=_uid(), email="lecturer2@uti.ie", full_name="Dr. Fionnuala Kelly",
                password_hash=pw, role=UserRole.LECTURER,
                department_id=dept_eng.id, totp_enabled=False, is_active=True)
    db.add_all([director, lec1, lec2])
    db.flush()

    # ── 4. PROGRAMMES ─────────────────────────────────────────────────────────
    prog_cs = Programme(id=_uid(), name="BSc Computer Science",
                        department_id=dept_cs.id, director_id=director.id, is_active=True)
    prog_ee = Programme(id=_uid(), name="BEng Electronic Engineering",
                        department_id=dept_eng.id, director_id=None, is_active=True)
    db.add_all([prog_cs, prog_ee])
    db.flush()

    # ── 5. MODULES (with year_of_study for auto-enroll) ───────────────────────
    AY = "2025/2026"

    mod_alg = Module(id=_uid(), module_code="CS401", module_name="Algorithms & Data Structures",
                     programme_id=prog_cs.id, lecturer_id=lec1.id,
                     academic_year=AY, semester="1", year_of_study=1)
    mod_ml  = Module(id=_uid(), module_code="CS402", module_name="Machine Learning Fundamentals",
                     programme_id=prog_cs.id, lecturer_id=lec1.id,
                     academic_year=AY, semester="1", year_of_study=2)
    mod_emb = Module(id=_uid(), module_code="EE401", module_name="Embedded Systems",
                     programme_id=prog_ee.id, lecturer_id=lec2.id,
                     academic_year=AY, semester="1", year_of_study=1)
    mod_sig = Module(id=_uid(), module_code="EE402", module_name="Signal Processing",
                     programme_id=prog_ee.id, lecturer_id=lec2.id,
                     academic_year=AY, semester="2", year_of_study=2)

    cs_modules = [mod_alg, mod_ml]
    ee_modules = [mod_emb, mod_sig]
    all_modules = cs_modules + ee_modules
    db.add_all(all_modules)
    db.flush()

    # ── 6. STUDENTS ───────────────────────────────────────────────────────────
    def make_student(num, name, email, prog_id, year_of_study, admission_year):
        return Student(
            id              = _uid(),
            student_number  = num,
            full_name       = name,
            email           = email,
            password_hash   = hash_password(num),
            programme_id    = prog_id,
            year_of_study   = year_of_study,
            admission_year  = admission_year,
            face_registered = False,
            is_active       = True,
        )

    # 2026 intake
    students_2026_cs = [
        make_student("STU20260001", "Oisín Fitzgerald",  "stu20260001@uti.ie", prog_cs.id, 1, 2026),
        make_student("STU20260002", "Caoimhe Doherty",   "stu20260002@uti.ie", prog_cs.id, 1, 2026),
    ]
    students_2026_ee = [
        make_student("STU20260003", "Darragh Connolly",  "stu20260003@uti.ie", prog_ee.id, 1, 2026),
        make_student("STU20260004", "Mairéad Burke",     "stu20260004@uti.ie", prog_ee.id, 1, 2026),
    ]

    # 2027 intake
    students_2027_cs = [
        make_student("STU20270001", "Rían O'Brien",      "stu20270001@uti.ie", prog_cs.id, 1, 2027),
        make_student("STU20270002", "Saoirse McCarthy",  "stu20270002@uti.ie", prog_cs.id, 1, 2027),
    ]
    students_2027_ee = [
        make_student("STU20270003", "Seán Higgins",      "stu20270003@uti.ie", prog_ee.id, 1, 2027),
        make_student("STU20270004", "Ciara Walsh",       "stu20270004@uti.ie", prog_ee.id, 1, 2027),
    ]

    all_cs_students = students_2026_cs + students_2027_cs
    all_ee_students = students_2026_ee + students_2027_ee
    all_students    = all_cs_students + all_ee_students
    db.add_all(all_students)
    db.flush()

    # ── 7. ENROLMENTS (Year 1 students → Year 1 modules only) ────────────────
    enrolments = []
    for s in all_cs_students:
        mods = [m for m in cs_modules if m.year_of_study == s.year_of_study]
        for m in mods:
            enrolments.append(ModuleEnrollment(id=_uid(), module_id=m.id, student_id=s.id))
    for s in all_ee_students:
        mods = [m for m in ee_modules if m.year_of_study == s.year_of_study]
        for m in mods:
            enrolments.append(ModuleEnrollment(id=_uid(), module_id=m.id, student_id=s.id))

    db.add_all(enrolments)
    db.flush()

    # ── 8. LECTURES (2 past lectures per module) ──────────────────────────────
    today = date.today()

    def past_monday(weeks_ago):
        monday = today - timedelta(days=today.weekday())
        return monday - timedelta(weeks=weeks_ago)

    def make_lectures(mod, day_offset, start_hour, end_hour, room):
        lectures = []
        for week in [2, 1]:
            d  = past_monday(week) + timedelta(days=day_offset)
            s  = datetime(d.year, d.month, d.day, start_hour, 0)
            e  = datetime(d.year, d.month, d.day, end_hour,   0)
            mp = s + (e - s) / 2
            lectures.append(ScheduledLecture(
                id              = _uid(),
                module_id       = mod.id,
                date            = d,
                start_time      = s.time(),
                end_time        = e.time(),
                room            = room,
                scan1_opens_at  = s,
                scan1_closes_at = s  + timedelta(minutes=15),
                scan2_opens_at  = mp - timedelta(minutes=10),
                scan2_closes_at = mp + timedelta(minutes=10),
                scan3_opens_at  = e  - timedelta(minutes=15),
                scan3_closes_at = e,
                is_recurring    = False,
                is_cancelled    = False,
            ))
        return lectures

    all_lectures  = make_lectures(mod_alg, 0, 9,  11, "A101")
    all_lectures += make_lectures(mod_ml,  0, 12, 14, "A102")
    all_lectures += make_lectures(mod_emb, 1, 9,  11, "ENG-101")
    all_lectures += make_lectures(mod_sig, 1, 12, 14, "ENG-102")

    db.add_all(all_lectures)
    db.commit()

    # ── SUMMARY ───────────────────────────────────────────────────────────────
    print("=" * 56)
    print("SEED COMPLETE — Minimal Dataset")
    print("=" * 56)
    print(f"  University  : Griffith College Limerick")
    print(f"  Departments : 2  (Computing · Engineering)")
    print(f"  Programmes  : 2  (BSc CS · BEng EE)")
    print(f"  Modules     : {len(all_modules)}  (CS401, CS402, EE401, EE402)")
    print(f"  Lectures    : {len(all_lectures)}  (2 per module, past dates)")
    print(f"  Students    : {len(all_students)}  (4×2026 · 4×2027)")
    print(f"  Enrolments  : {len(enrolments)}")
    print()
    print("  STAFF (password: Staff@1234)")
    print("  ─────────────────────────────────────────")
    print("  director@uti.ie   → Dr. Aoife Brennan  (Programme Director)")
    print("  lecturer1@uti.ie  → Dr. Ciarán Murphy  (CS modules)")
    print("  lecturer2@uti.ie  → Dr. Fionnuala Kelly (EE modules)")
    print()
    print("  STUDENTS (password = student number)")
    print("  ─────────────────────────────────────────")
    print("  2026 CS: stu20260001@uti.ie  stu20260002@uti.ie")
    print("  2026 EE: stu20260003@uti.ie  stu20260004@uti.ie")
    print("  2027 CS: stu20270001@uti.ie  stu20270002@uti.ie")
    print("  2027 EE: stu20270003@uti.ie  stu20270004@uti.ie")
    print("  e.g. email: stu20260001@uti.ie  pw: STU20260001")
    print("=" * 56)
