from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, Student
from app.core.security import (
    verify_password, create_access_token, create_refresh_token,
    decode_token, generate_totp_secret, generate_qr_code, verify_totp
)
from app.core.dependencies import get_current_user, get_current_student
from app.schemas.auth import (
    LoginRequest, TOTPVerifyRequest, TokenResponse,
    QRSetupResponse, Requires2FAResponse, RefreshRequest, UserMeResponse
)

router = APIRouter()


def _issue_tokens(user_id: str, full_name: str, email: str, role: str) -> TokenResponse:
    """Build token response — shared between staff and student login."""
    return TokenResponse(
        access_token = create_access_token({"sub": user_id, "role": role}),
        refresh_token= create_refresh_token({"sub": user_id, "role": role}),
        user_id      = user_id,
        full_name    = full_name,
        email        = email,
        role         = role,
    )


def _handle_login(entity, password: str):
    """
    Shared login logic for both User and Student.
    Returns QRSetupResponse | Requires2FAResponse — never a token directly.
    Tokens are only issued after TOTP verification.
    """
    if not entity or not verify_password(password, entity.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not getattr(entity, "is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )

    # First login — no TOTP secret yet
    if not entity.totp_secret:
        secret  = generate_totp_secret()
        entity.totp_secret = secret
        return {"needs_setup": True, "entity": entity, "secret": secret}

    # Returning login — TOTP already configured
    return {"needs_setup": False, "entity": entity}


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """
    Step 1 of login flow.
    Returns QR setup data (first login) or 2FA prompt (returning login).
    Never returns a token — tokens require TOTP verification.
    """
    # Check staff users first, then students
    user = db.query(User).filter(User.email == body.email).first()

    if user:
        result = _handle_login(user, body.password)
        if result["needs_setup"]:
            db.commit()
            return QRSetupResponse(
                user_id    = user.id,
                qr_code    = generate_qr_code(result["secret"], user.email),
                message    = "Scan this QR code with Google Authenticator",
                is_student = False,
            )
        return Requires2FAResponse(
            user_id    = user.id,
            message    = "Enter the 6-digit code from your authenticator app",
            is_student = False,
        )

    # Try student login
    student = db.query(Student).filter(Student.email == body.email).first()
    if student:
        result = _handle_login(student, body.password)
        if result["needs_setup"]:
            db.commit()
            return QRSetupResponse(
                user_id    = student.id,
                qr_code    = generate_qr_code(result["secret"], student.email),
                message    = "Scan this QR code with Google Authenticator",
                is_student = True,
            )
        return Requires2FAResponse(
            user_id    = student.id,
            message    = "Enter the 6-digit code from your authenticator app",
            is_student = True,
        )

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")


@router.post("/verify-2fa-setup", response_model=TokenResponse)
def verify_2fa_setup(body: TOTPVerifyRequest, db: Session = Depends(get_db)):
    """
    Step 2a — first-time TOTP verification.
    Enables 2FA on the account and issues tokens.
    """
    entity = _find_entity(body.user_id, body.is_student, db)

    if not entity.totp_secret:
        raise HTTPException(status_code=400, detail="No TOTP secret found — restart login")

    if not verify_totp(entity.totp_secret, body.code):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid code — please try again")

    entity.totp_enabled = True
    db.commit()

    role = "STUDENT" if body.is_student else entity.role.value
    return _issue_tokens(entity.id, entity.full_name, entity.email, role)


@router.post("/verify-2fa", response_model=TokenResponse)
def verify_2fa(body: TOTPVerifyRequest, db: Session = Depends(get_db)):
    """
    Step 2b — recurring TOTP verification.
    Validates code and issues tokens.
    """
    entity = _find_entity(body.user_id, body.is_student, db)

    if not entity.totp_secret or not entity.totp_enabled:
        raise HTTPException(status_code=400, detail="2FA not configured for this account")

    if not verify_totp(entity.totp_secret, body.code):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid code — please try again")

    role = "STUDENT" if body.is_student else entity.role.value
    return _issue_tokens(entity.id, entity.full_name, entity.email, role)


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(body: RefreshRequest, db: Session = Depends(get_db)):
    """Exchange a valid refresh token for a new access token."""
    payload = decode_token(body.refresh_token)

    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user_id = payload.get("sub")
    role    = payload.get("role")

    # Verify entity still exists and is active
    entity = (
        db.query(Student).filter(Student.id == user_id).first()
        if role == "STUDENT"
        else db.query(User).filter(User.id == user_id).first()
    )

    if not entity or not entity.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account not found or inactive")

    return _issue_tokens(entity.id, entity.full_name, entity.email, role)


@router.get("/me")
def get_me(
    current_user: User = Depends(get_current_user),
):
    """Return current staff user profile."""
    return {
        "id"       : current_user.id,
        "email"    : current_user.email,
        "full_name": current_user.full_name,
        "role"     : current_user.role.value,
        "is_active": current_user.is_active,
    }


@router.get("/me/student")
def get_me_student(current_student: Student = Depends(get_current_student)):
    """Return current student profile."""
    return {
        "id"            : current_student.id,
        "email"         : current_student.email,
        "full_name"     : current_student.full_name,
        "student_number": current_student.student_number,
        "role"          : "STUDENT",
        "face_registered": current_student.face_registered,
    }


# ── Private helper ────────────────────────────────────────────────────────

def _find_entity(user_id: str, is_student: bool, db: Session):
    """Fetch User or Student by ID — raises 404 if not found."""
    if is_student:
        entity = db.query(Student).filter(Student.id == user_id).first()
    else:
        entity = db.query(User).filter(User.id == user_id).first()

    if not entity:
        raise HTTPException(status_code=404, detail="Account not found")
    return entity