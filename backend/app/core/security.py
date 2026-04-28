import io
import uuid
import pyotp
import qrcode
import base64
from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import get_settings

settings = get_settings()
pwd_ctx  = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_ctx.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)


def create_access_token(claims: dict) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": claims["sub"], "exp": expire, "type": "access", "jti": str(uuid.uuid4())}
    if "role" in claims:
        payload["role"] = claims["role"]
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def create_refresh_token(claims: dict) -> str:
    expire = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
    payload = {"sub": claims["sub"], "exp": expire, "type": "refresh", "jti": str(uuid.uuid4())}
    if "role" in claims:
        payload["role"] = claims["role"]
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        return None


def generate_totp_secret() -> str:
    return pyotp.random_base32()


def generate_qr_code(secret: str, email: str) -> str:
    """Returns base64-encoded PNG of the QR code."""
    uri    = pyotp.totp.TOTP(secret).provisioning_uri(name=email, issuer_name="FaceAttend")
    img    = qrcode.make(uri)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode()


def verify_totp(secret: str, code: str) -> bool:
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)