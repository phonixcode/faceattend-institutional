from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.security import decode_token
from app.models.user import User, Student, UserRole

bearer = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db         : Session                      = Depends(get_db),
) -> User:
    token = credentials.credentials
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code = status.HTTP_401_UNAUTHORIZED,
            detail      = "Invalid or expired token",
        )
    user_id = payload.get("sub")
    user    = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


def get_current_student(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db         : Session                      = Depends(get_db),
) -> Student:
    token   = credentials.credentials
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    student_id = payload.get("sub")
    student    = db.query(Student).filter(
        Student.id == student_id, Student.is_active == True
    ).first()
    if not student:
        raise HTTPException(status_code=401, detail="Student not found or inactive")
    return student


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.SYSTEM_ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def require_lecturer(user: User = Depends(get_current_user)) -> User:
    if user.role not in (UserRole.SYSTEM_ADMIN, UserRole.LECTURER):
        raise HTTPException(status_code=403, detail="Lecturer access required")
    return user


def require_director(user: User = Depends(get_current_user)) -> User:
    if user.role not in (UserRole.SYSTEM_ADMIN, UserRole.PROGRAMME_DIRECTOR):
        raise HTTPException(status_code=403, detail="Director access required")
    return user


def require_staff(user: User = Depends(get_current_user)) -> User:
    """Any authenticated staff user."""
    return user