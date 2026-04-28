from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.dependencies import require_admin
from app.core.security import hash_password
from app.models.user import User, Student, UserRole
from app.models.academic import University, Department, Programme, Module, ModuleEnrollment
from app.schemas.academic import (
    UniversityCreate, UniversityResponse,
    DepartmentCreate, DepartmentResponse,
    ProgrammeCreate, ProgrammeResponse,
    ModuleCreate, ModuleUpdate, ModuleResponse,
    UserCreate, UserUpdate, UserResponse,
    StudentCreate, StudentResponse,
    PaginatedResponse,
)
import uuid

PAGE_SIZE_DEFAULT = 20
PAGE_SIZE_MAX = 100

router = APIRouter()


# ═══════════════════════════════════════════
#  DASHBOARD STATS
# ═══════════════════════════════════════════

@router.get("/dashboard")
def admin_dashboard(
    db   : Session = Depends(get_db),
    _user: User    = Depends(require_admin),
):
    """System-wide overview stats for admin dashboard."""
    return {
        "total_users"      : db.query(User).filter(User.is_active == True).count(),
        "total_students"   : db.query(Student).filter(Student.is_active == True).count(),
        "total_modules"    : db.query(Module).filter(Module.is_active == True).count(),
        "total_programmes" : db.query(Programme).filter(Programme.is_active == True).count(),
        "total_departments": db.query(Department).count(),
        "users_by_role"    : _users_by_role(db),
    }

def _users_by_role(db: Session) -> dict:
    counts = {}
    for role in UserRole:
        counts[role.value] = db.query(User).filter(
            User.role == role, User.is_active == True
        ).count()
    return counts


# ═══════════════════════════════════════════
#  USER MANAGEMENT
# ═══════════════════════════════════════════

@router.get("/users", response_model=PaginatedResponse[UserResponse])
def list_users(
    page     : int = 1,
    page_size: int = PAGE_SIZE_DEFAULT,
    db       : Session = Depends(get_db),
    _user    : User    = Depends(require_admin),
):
    page_size = min(max(1, page_size), PAGE_SIZE_MAX)
    q = db.query(User).order_by(User.created_at.desc())
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    body : UserCreate,
    db   : Session = Depends(get_db),
    _user: User    = Depends(require_admin),
):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        id           = str(uuid.uuid4()),
        email        = body.email,
        full_name    = body.full_name,
        password_hash= hash_password(body.password),
        role         = body.role,
        department_id= body.department_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(
    user_id: str,
    db     : Session = Depends(get_db),
    _user  : User    = Depends(require_admin),
):
    user = _get_or_404(db, User, user_id)
    return user


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    body   : UserUpdate,
    db     : Session = Depends(get_db),
    _user  : User    = Depends(require_admin),
):
    user = _get_or_404(db, User, user_id)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_user(
    user_id: str,
    db     : Session = Depends(get_db),
    _user  : User    = Depends(require_admin),
):
    """Soft delete — sets is_active=False. Data is preserved."""
    user = _get_or_404(db, User, user_id)
    user.is_active = False
    db.commit()


# ═══════════════════════════════════════════
#  STUDENT MANAGEMENT
# ═══════════════════════════════════════════

@router.get("/students", response_model=PaginatedResponse[StudentResponse])
def list_students(
    page     : int = 1,
    page_size: int = PAGE_SIZE_DEFAULT,
    db       : Session = Depends(get_db),
    _user    : User    = Depends(require_admin),
):
    page_size = min(max(1, page_size), PAGE_SIZE_MAX)
    q = db.query(Student).order_by(Student.created_at.desc())
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)


@router.post("/students", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def create_student(
    body : StudentCreate,
    db   : Session = Depends(get_db),
    _user: User    = Depends(require_admin),
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


@router.patch("/students/{student_id}", response_model=StudentResponse)
def update_student(
    student_id: str,
    body      : UserUpdate,
    db        : Session = Depends(get_db),
    _user     : User    = Depends(require_admin),
):
    student = _get_or_404(db, Student, student_id)
    for field, value in body.model_dump(exclude_none=True).items():
        if hasattr(student, field):
            setattr(student, field, value)
    db.commit()
    db.refresh(student)
    return student


@router.delete("/students/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_student(
    student_id: str,
    db        : Session = Depends(get_db),
    _user     : User    = Depends(require_admin),
):
    student = _get_or_404(db, Student, student_id)
    student.is_active = False
    db.commit()


# ═══════════════════════════════════════════
#  UNIVERSITIES
# ═══════════════════════════════════════════

@router.get("/universities", response_model=list[UniversityResponse])
def list_universities(
    db   : Session = Depends(get_db),
    _user: User    = Depends(require_admin),
):
    return db.query(University).all()


@router.post("/universities", response_model=UniversityResponse, status_code=status.HTTP_201_CREATED)
def create_university(
    body : UniversityCreate,
    db   : Session = Depends(get_db),
    _user: User    = Depends(require_admin),
):
    uni = University(id=str(uuid.uuid4()), **body.model_dump())
    db.add(uni)
    db.commit()
    db.refresh(uni)
    return uni


# ═══════════════════════════════════════════
#  DEPARTMENTS
# ═══════════════════════════════════════════

@router.get("/departments", response_model=list[DepartmentResponse])
def list_departments(
    db   : Session = Depends(get_db),
    _user: User    = Depends(require_admin),
):
    return db.query(Department).all()


@router.post("/departments", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(
    body : DepartmentCreate,
    db   : Session = Depends(get_db),
    _user: User    = Depends(require_admin),
):
    _get_or_404(db, University, body.university_id)
    dept = Department(id=str(uuid.uuid4()), **body.model_dump())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


@router.delete("/departments/{dept_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(
    dept_id: str,
    db     : Session = Depends(get_db),
    _user  : User    = Depends(require_admin),
):
    dept = _get_or_404(db, Department, dept_id)
    db.delete(dept)
    db.commit()


# ═══════════════════════════════════════════
#  PROGRAMMES
# ═══════════════════════════════════════════

@router.get("/programmes", response_model=PaginatedResponse[ProgrammeResponse])
def list_programmes(
    page     : int = 1,
    page_size: int = PAGE_SIZE_DEFAULT,
    db       : Session = Depends(get_db),
    _user    : User    = Depends(require_admin),
):
    page_size = min(max(1, page_size), PAGE_SIZE_MAX)
    q = db.query(Programme).order_by(Programme.name)
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)


@router.post("/programmes", response_model=ProgrammeResponse, status_code=status.HTTP_201_CREATED)
def create_programme(
    body : ProgrammeCreate,
    db   : Session = Depends(get_db),
    _user: User    = Depends(require_admin),
):
    _get_or_404(db, Department, body.department_id)
    prog = Programme(id=str(uuid.uuid4()), **body.model_dump())
    db.add(prog)
    db.commit()
    db.refresh(prog)
    return prog


@router.patch("/programmes/{prog_id}", response_model=ProgrammeResponse)
def update_programme(
    prog_id: str,
    body   : ProgrammeCreate,
    db     : Session = Depends(get_db),
    _user  : User    = Depends(require_admin),
):
    prog = _get_or_404(db, Programme, prog_id)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(prog, field, value)
    db.commit()
    db.refresh(prog)
    return prog


@router.delete("/programmes/{prog_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_programme(
    prog_id: str,
    db     : Session = Depends(get_db),
    _user  : User    = Depends(require_admin),
):
    prog = _get_or_404(db, Programme, prog_id)
    prog.is_active = False
    db.commit()


# ═══════════════════════════════════════════
#  MODULES
# ═══════════════════════════════════════════

@router.get("/modules", response_model=PaginatedResponse[ModuleResponse])
def list_all_modules(
    page     : int = 1,
    page_size: int = PAGE_SIZE_DEFAULT,
    db       : Session = Depends(get_db),
    _user    : User    = Depends(require_admin),
):
    page_size = min(max(1, page_size), PAGE_SIZE_MAX)
    q = db.query(Module).order_by(Module.created_at.desc())
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)


@router.post("/modules", response_model=ModuleResponse, status_code=status.HTTP_201_CREATED)
def create_module(
    body : ModuleCreate,
    db   : Session = Depends(get_db),
    _user: User    = Depends(require_admin),
):
    _get_or_404(db, Programme, body.programme_id)
    module = Module(id=str(uuid.uuid4()), **body.model_dump())
    db.add(module)
    db.commit()
    db.refresh(module)
    return module


@router.patch("/modules/{module_id}", response_model=ModuleResponse)
def update_module(
    module_id: str,
    body     : ModuleUpdate,
    db       : Session = Depends(get_db),
    _user    : User    = Depends(require_admin),
):
    module = _get_or_404(db, Module, module_id)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(module, field, value)
    db.commit()
    db.refresh(module)
    return module


@router.delete("/modules/{module_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_module(
    module_id: str,
    db       : Session = Depends(get_db),
    _user    : User    = Depends(require_admin),
):
    module = _get_or_404(db, Module, module_id)
    module.is_active = False
    db.commit()


# ═══════════════════════════════════════════
#  REPORTS
# ═══════════════════════════════════════════

@router.get("/reports")
def system_reports(
    db   : Session = Depends(get_db),
    _user: User    = Depends(require_admin),
):
    """High-level system-wide attendance overview."""
    from app.models.attendance import AttendanceRecord, AttendanceScan, ScheduledLecture

    total_records  = db.query(AttendanceRecord).count()
    total_lectures = db.query(ScheduledLecture).count()
    needs_review   = db.query(AttendanceRecord).filter(
        AttendanceRecord.needs_review == True
    ).count()

    return {
        "total_attendance_records": total_records,
        "total_lectures_scheduled": total_lectures,
        "records_needing_review"  : needs_review,
        "modules_active"          : db.query(Module).filter(Module.is_active == True).count(),
        "students_with_face"      : db.query(Student).filter(Student.face_registered == True).count(),
    }


# ═══════════════════════════════════════════
#  SHARED HELPER
# ═══════════════════════════════════════════

def _get_or_404(db: Session, model, record_id: str):
    """Fetch any ORM model by ID or raise 404."""
    record = db.query(model).filter(model.id == record_id).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{model.__name__} not found"
        )
    return record