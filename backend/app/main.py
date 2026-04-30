from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.core.config import get_settings

settings = get_settings()

# Register all models before create_all
from app.models import __init__ as _  # noqa

from app.routers import auth, admin, lecturer, kiosk, director, student, public

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title       = "FaceAttend Institutional API",
    description = "Multi-role university attendance system with three-scan grading",
    version     = "1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins     = [settings.frontend_url, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

app.include_router(auth.router,     prefix="/auth",     tags=["Auth"])
app.include_router(admin.router,    prefix="/admin",    tags=["Admin"])
app.include_router(lecturer.router, prefix="/lecturer", tags=["Lecturer"])
app.include_router(kiosk.router,    prefix="/scans",    tags=["Kiosk"])
app.include_router(director.router, prefix="/director", tags=["Director"])
app.include_router(student.router,  prefix="/student",  tags=["Student"])
app.include_router(public.router,   prefix="/public",   tags=["Public"])


@app.on_event("startup")
def on_startup():
    from app.database import SessionLocal
    from app.services.seeder import seed_default_admin

    db = SessionLocal()
    try:
        seed_default_admin(db)
    finally:
        db.close()


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "version": "1.0.0"}