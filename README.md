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
