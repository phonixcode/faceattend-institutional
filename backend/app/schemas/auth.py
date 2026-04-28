from pydantic import BaseModel, EmailStr
from app.models.user import UserRole


class LoginRequest(BaseModel):
    email   : EmailStr
    password: str


class TOTPVerifyRequest(BaseModel):
    user_id: str
    code   : str
    is_student: bool = False


class TokenResponse(BaseModel):
    access_token : str
    refresh_token: str
    token_type   : str = "bearer"
    user_id      : str
    full_name    : str
    email        : str
    role         : str


class QRSetupResponse(BaseModel):
    requires_2fa_setup: bool = True
    user_id           : str
    qr_code           : str
    message           : str
    is_student        : bool = False


class Requires2FAResponse(BaseModel):
    requires_2fa: bool = True
    user_id     : str
    message     : str
    is_student  : bool = False


class RefreshRequest(BaseModel):
    refresh_token: str


class UserMeResponse(BaseModel):
    id       : str
    email    : str
    full_name: str
    role     : str

    class Config:
        from_attributes = True