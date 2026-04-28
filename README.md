# FaceAttend Institutional

Multi-role university attendance system with facial recognition.

## Prerequisites

- Python 3.12
- Node.js 18+
- npm

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/phonixcode/faceattend-institutional.git
cd faceattend-institutional
```

### 2. Backend

```bash
cd backend

# Create and activate virtual environment
python3.12 -m venv venv
source venv/bin/activate        # macOS/Linux
# venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Create your .env file
cp .env.example .env
```

Open `.env` and set the following required values:

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | Random secret for JWT signing |
| `ENCRYPTION_KEY` | Fernet key for face data encryption — generate with `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |
| `DATABASE_URL` | Defaults to `sqlite:///./faceattend.db` (no change needed for local dev) |
| `FRONTEND_URL` | Defaults to `http://localhost:5173` (no change needed for local dev) |
| `EMAIL_SENDER` / `EMAIL_PASSWORD` | Only needed if `EMAIL_ENABLED=true` |

Start the backend:

```bash
uvicorn app.main:app --reload
```

API runs at `http://localhost:8000`. Docs at `http://localhost:8000/docs`.

### 3. Frontend

```bash
cd ../frontend

npm install
npm run dev
```

App runs at `http://localhost:5173`.

---

## Running Both Together

Open two terminals:

```bash
# Terminal 1 — backend
cd backend && source venv/bin/activate && uvicorn app.main:app --reload

# Terminal 2 — frontend
cd frontend && npm run dev
```

---

## Notes

- The SQLite database (`faceattend.db`) is created automatically on first backend start.
- Face recognition models are downloaded automatically by DeepFace on first use — this may take a few minutes.
- The `pending_uploads/` directory is created automatically for face image storage.
