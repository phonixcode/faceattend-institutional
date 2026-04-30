from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    secret_key                  : str   = "2fe66327175d7cb163600736c680c72623fd8a6637e26cfe0ca38c51da3eb17c"
    algorithm                   : str   = "HS256"
    access_token_expire_minutes : int   = 480
    refresh_token_expire_days   : int   = 7

    database_url                : str   = "sqlite:///./faceattend.db"

    recognition_threshold       : float = 0.40
    model_name                  : str   = "Facenet"
    detector_backend            : str   = "opencv"

    smtp_host                   : str   = "sandbox.smtp.mailtrap.io"
    smtp_port                   : int   = 587
    smtp_user                   : str   = ""
    smtp_password               : str   = ""
    email_from                  : str   = "noreply@faceattend.ie"
    email_enabled               : bool  = False

    frontend_url                : str   = "http://localhost:5173"

    encryption_key              : str   = ""
    data_dir                    : str   = "."
    upload_dir                  : str   = "pending_uploads"

    class Config:
        env_file        = ".env"
        extra           = "ignore"   # ignore any unknown keys in .env

@lru_cache
def get_settings() -> Settings:
    return Settings()