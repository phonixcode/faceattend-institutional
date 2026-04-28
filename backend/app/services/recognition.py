import os
import json
import numpy as np
from cryptography.fernet import Fernet
from app.core.config import get_settings

settings = get_settings()
_fernet  = None


def _get_fernet() -> Fernet:
    """Lazy initialisation — called automatically on first use."""
    global _fernet
    if _fernet:
        return _fernet

    # Priority 1 — env var (production)
    if settings.encryption_key:
        _fernet = Fernet(settings.encryption_key.encode())
        return _fernet

    # Priority 2 — local key file (development)
    key_file = os.path.join(settings.data_dir, "encryption.key")
    if os.path.exists(key_file):
        key = open(key_file, "rb").read()
    else:
        key = Fernet.generate_key()
        os.makedirs(settings.data_dir, exist_ok=True)
        open(key_file, "wb").write(key)
        print(f"New encryption key generated → {key_file}")
        print(f"   Copy to ENCRYPTION_KEY env var for production: {key.decode()}")

    _fernet = Fernet(key)
    return _fernet


def encrypt_embedding(embedding: list[float]) -> str:
    raw = json.dumps(embedding).encode()
    return _get_fernet().encrypt(raw).decode()


def decrypt_embedding(encrypted: str) -> list[float]:
    raw = _get_fernet().decrypt(encrypted.encode())
    return json.loads(raw)


def _detector_backends() -> list[str]:
    order = (
        "retinaface",
        "mtcnn",
        "ssd",
        settings.detector_backend,
        "opencv",
    )
    seen: set[str] = set()
    out: list[str] = []
    for b in order:
        if b and b not in seen:
            seen.add(b)
            out.append(b)
    return out


def _no_enforce_backends() -> list[str]:
    order = ("retinaface", "mtcnn", "ssd", settings.detector_backend, "opencv")
    seen: set[str] = set()
    out: list[str] = []
    for b in order:
        if b and b not in seen:
            seen.add(b)
            out.append(b)
    return out


def generate_embedding(image_bytes: bytes) -> list[float] | None:
    try:
        from deepface import DeepFace
        import tempfile

        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
            f.write(image_bytes)
            tmp_path = f.name

        last_err: str | None = None
        try:
            for backend in _detector_backends():
                try:
                    result = DeepFace.represent(
                        img_path          = tmp_path,
                        model_name        = settings.model_name,
                        detector_backend  = backend,
                        enforce_detection = True,
                    )
                    if result and result[0].get("embedding") is not None:
                        return result[0]["embedding"]
                except Exception as e:
                    last_err = str(e)

            for backend in _no_enforce_backends():
                try:
                    result = DeepFace.represent(
                        img_path          = tmp_path,
                        model_name        = settings.model_name,
                        detector_backend  = backend,
                        enforce_detection = False,
                    )
                    if result and result[0].get("embedding") is not None:
                        return result[0]["embedding"]
                except Exception as e:
                    last_err = str(e)

            if last_err:
                print(f"Embedding failed (all detectors): {last_err}")
            return None
        finally:
            os.unlink(tmp_path)

    except Exception as e:
        print(f"Embedding error: {e}")
        return None


def cosine_distance(a: list[float], b: list[float]) -> float:
    va = np.array(a)
    vb = np.array(b)
    n1, n2 = np.linalg.norm(va), np.linalg.norm(vb)
    if n1 == 0 or n2 == 0:
        return 999.0
    return float(1 - np.dot(va, vb) / (n1 * n2))


def recognise_faces(
    image_bytes_list : list[bytes],
    stored_embeddings: list[dict],
) -> list[dict]:
    if not stored_embeddings:
        return [
            {"status": "UNKNOWN", "student_id": None, "confidence": 0.0, "distance": 999.0}
            for _ in image_bytes_list
        ]

    # Decrypt all stored embeddings once up front
    decrypted = []
    for e in stored_embeddings:
        try:
            decrypted.append({
                "student_id": e["student_id"],
                "vec"       : decrypt_embedding(e["embedding"]),
            })
        except Exception:
            continue

    results = []
    for img_bytes in image_bytes_list:
        query_vec = generate_embedding(img_bytes)

        if query_vec is None:
            results.append({
                "status": "ERROR", "student_id": None,
                "confidence": 0.0, "distance": 999.0,
            })
            continue

        best_dist    = 999.0
        best_student = None

        for stored in decrypted:
            dist = cosine_distance(query_vec, stored["vec"])
            if dist < best_dist:
                best_dist    = dist
                best_student = stored["student_id"]

        confidence = max(0.0, round((1 - best_dist) * 100, 1))

        if best_dist <= settings.recognition_threshold and best_student:
            results.append({
                "status"    : "MATCH",
                "student_id": best_student,
                "confidence": confidence,
                "distance"  : best_dist,
            })
        else:
            results.append({
                "status"    : "UNKNOWN",
                "student_id": None,
                "confidence": confidence,
                "distance"  : best_dist,
            })

    return results