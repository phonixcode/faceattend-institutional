"""
Public routes — no authentication required.
Student self-registration portal.
"""
import os
import json
import uuid
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.academic import Module
from app.models.registration import PendingRegistration

router  = APIRouter()
UPLOADS = "pending_uploads"
os.makedirs(UPLOADS, exist_ok=True)


@router.post("/register")
async def public_register(
    full_name     : str        = Form(...),
    student_number: str        = Form(...),
    email         : str        = Form(...),
    module_id     : str        = Form(...),
    images        : list[UploadFile] = File(...),
    db            : Session    = Depends(get_db),
):
    """
    Student self-registration — no auth required.
    Saves face images to disk and creates a pending registration record.
    Lecturer approves or rejects from the dashboard.
    """
    module = db.query(Module).filter(Module.id == module_id, Module.is_active == True).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    if len(images) < 3:
        raise HTTPException(status_code=400, detail="Minimum 3 face images required")

    # Save images to temp folder
    reg_id = str(uuid.uuid4())
    folder = os.path.join(UPLOADS, reg_id)
    os.makedirs(folder, exist_ok=True)

    saved_paths = []
    for i, image in enumerate(images):
        path = os.path.join(folder, f"capture_{i}.jpg")
        with open(path, "wb") as f:
            f.write(await image.read())
        saved_paths.append(path)

    reg = PendingRegistration(
        id            = reg_id,
        module_id     = module_id,
        full_name     = full_name,
        student_number= student_number,
        email         = email,
        images_path   = json.dumps(saved_paths),
    )
    db.add(reg)
    db.commit()

    return {
        "message"        : "Registration submitted — awaiting lecturer approval",
        "registration_id": reg_id,
    }


@router.get("/register/module/{module_id}")
def get_module_info(module_id: str, db: Session = Depends(get_db)):
    """Return basic module info for the self-registration page header."""
    module = db.query(Module).filter(Module.id == module_id, Module.is_active == True).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    return {
        "module_code": module.module_code,
        "module_name": module.module_name,
    }