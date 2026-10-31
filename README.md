# Personal Hub

A local-first personal productivity dashboard built with React, FastAPI, SQLAlchemy, and SQLite.

## Status

V0.1 supports persistent task and project management from the dashboard. Calendar events, a
database-backed Today view, and later AI-assisted features remain future work.

## Local development

Run the backend and frontend in separate terminals:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

```powershell
cd frontend
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

### Optional display name

Each installation can set its own display name. From `frontend`, copy
`.env.example` to `.env.local` if the local file does not already exist, then set
`VITE_DISPLAY_NAME` to your preferred name and restart Vite.

The local file is gitignored. Leaving the name blank shows a neutral greeting,
"Your workspace", and a "PH" avatar. This is a frontend display preference, not
a login or account system. Google credentials stay in `backend/.env`.
