import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class PendingRegistration(Base):
    __tablename__ = "pending_registrations"

    id           : Mapped[str]       = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    module_id    : Mapped[str]       = mapped_column(ForeignKey("modules.id"), nullable=False)
    full_name    : Mapped[str]       = mapped_column(String, nullable=False)
    student_number: Mapped[str]      = mapped_column(String, nullable=False)
    email        : Mapped[str]       = mapped_column(String, nullable=False)
    images_path  : Mapped[str]       = mapped_column(Text, nullable=False)  # JSON array of file paths
    status       : Mapped[str]       = mapped_column(String, default="pending")  # pending | approved | rejected
    submitted_at : Mapped[datetime]  = mapped_column(DateTime, default=datetime.utcnow)
    reviewed_at  : Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    reviewed_by  : Mapped[str | None]      = mapped_column(String, nullable=True)