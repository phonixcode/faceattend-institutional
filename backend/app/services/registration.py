"""
Student registration service.
Handles face capture, embedding generation, bulk CSV import,
and the pending self-registration approval flow.
"""
import uuid
import json
import csv
import io
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import Student
from app.models.academic import Module, ModuleEnrollment, Programme
from app.models.attendance import FaceEmbedding
from app.core.security import hash_password
from app.services.recognition import generate_embedding, encrypt_embedding


def register_face_images(
    student_id  : str,
    image_bytes_list: list[bytes],
    db          : Session,
) -> int:
    """
    Generate FaceNet embeddings for each image and store encrypted.
    Returns count of successfully stored embeddings.
    Raises HTTPException if no face is detected in any image.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    stored = 0
    for image_bytes in image_bytes_list:
        embedding = generate_embedding(image_bytes)
        if embedding is None:
            continue  # Skip frames with no face detected — not a hard failure

        record = FaceEmbedding(
            id        = str(uuid.uuid4()),
            student_id= student_id,
            embedding = encrypt_embedding(embedding),
        )
        db.add(record)
        stored += 1

    if stored == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No face detected in any of the submitted images — please retake"
        )

    student.face_registered = True
    db.commit()
    return stored


def enrol_students_in_module(
    module_id  : str,
    student_ids: list[str],
    db         : Session,
) -> list[ModuleEnrollment]:
    """
    Enrol a list of students in a module.
    Skips already-enrolled students silently — idempotent.
    """
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    existing = {
        e.student_id for e in
        db.query(ModuleEnrollment).filter(ModuleEnrollment.module_id == module_id).all()
    }

    new_enrolments = []
    for student_id in student_ids:
        if student_id in existing:
            continue
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            continue
        enrolment = ModuleEnrollment(
            id        = str(uuid.uuid4()),
            module_id = module_id,
            student_id= student_id,
        )
        db.add(enrolment)
        new_enrolments.append(enrolment)

    db.commit()
    return new_enrolments


def bulk_import_students(
    csv_bytes   : bytes,
    programme_id: str,
    db          : Session,
) -> dict:
    """
    Import students from a CSV file.
    Expected columns: student_number, full_name, email, year_of_study
    Default password: student number (student must change on first login).
    Returns summary of created, skipped, and failed rows.
    """
    reader  = csv.DictReader(io.StringIO(csv_bytes.decode("utf-8-sig")))
    created = []
    skipped = []
    failed  = []

    required_cols = {"student_number", "full_name", "email"}
    if not required_cols.issubset(set(reader.fieldnames or [])):
        raise HTTPException(
            status_code=400,
            detail=f"CSV must contain columns: {', '.join(required_cols)}"
        )

    for i, row in enumerate(reader, start=2):
        try:
            student_number = row["student_number"].strip()
            full_name      = row["full_name"].strip()
            email          = row["email"].strip().lower()
            year_of_study  = int(row.get("year_of_study", 1) or 1)

            if not all([student_number, full_name, email]):
                failed.append({"row": i, "reason": "Missing required field"})
                continue

            # Skip duplicates
            if db.query(Student).filter(
                (Student.email == email) | (Student.student_number == student_number)
            ).first():
                skipped.append({"row": i, "student_number": student_number})
                continue

            student = Student(
                id            = str(uuid.uuid4()),
                student_number= student_number,
                full_name     = full_name,
                email         = email,
                password_hash = hash_password(student_number),  # default password = student number
                programme_id  = programme_id,
                year_of_study = year_of_study,
            )
            db.add(student)
            created.append(student_number)

        except Exception as e:
            failed.append({"row": i, "reason": str(e)})

    db.commit()
    return {
        "created": len(created),
        "skipped": len(skipped),
        "failed" : len(failed),
        "details": {"created": created, "skipped": skipped, "failed": failed}
    }