# PersonalHub

A local-first productivity dashboard for managing tasks, projects, and events in one place. Built with **React, TypeScript, Vite, Tailwind CSS, FastAPI, SQLAlchemy, and SQLite**.

## Features

- **Today dashboard:** a date-aware overview of scheduled events, overdue/due/high-priority tasks, and active projects.
- **Tasks and projects:** create, update, and organise work backed by a local SQLite database.
- **Schedule:** manage locally stored events alongside tasks and projects.
- **Dashboard navigation:** quick actions, search filtering, and clear loading/error states.
- **Optional Google Calendar integration:** OAuth connection, manual sync, connection status, and disconnect endpoints. Connecting requires your own Google credentials and configuration.

> **Project status:** An actively developed local application, not a hosted service. Google Calendar syncing is user-initiated; the dashboard does not continuously poll Google for updates. AI assistance is not implemented.

## Run locally

### Prerequisites

- Python 3 and Node.js/npm
- A virtual environment is recommended for the backend

### Backend

From the repository root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API runs at `http://127.0.0.1:8000` by default. Open `http://127.0.0.1:8000/docs` for the interactive API documentation, or `/health` for a basic health check.

### Frontend

In a separate terminal, from the repository root:

```powershell
cd frontend
npm install
npm run dev
```

Open the local address printed by Vite (normally `http://localhost:5173`). Keep the backend running while using the dashboard.

### Optional display name

From `frontend`, copy `.env.example` to `.env.local` and set `VITE_DISPLAY_NAME`. Restart Vite after changing it.

Leave the variable blank for a neutral "Your workspace" greeting and "PH" avatar. This only changes local presentation; it does **not** create a user account.

### Google Calendar

Google Calendar requires separately configured OAuth credentials on the backend. Keep secrets in `backend/.env` and **never commit credentials, tokens, or local environment files**. The integration exposes status, connect, callback, disconnect, event-listing, and manual sync routes under `/integrations/google-calendar`.

If Google Calendar isn't configured, the core local dashboard remains usable. Calendar sync is manual rather than automatic.

## Development notes

- Local data is stored through SQLAlchemy/SQLite.
- The frontend and backend are separate development processes.
- API routes include `/health`, `/tasks`, `/projects`, `/events`, and `/today`.
- The application is still evolving; features and setup details may change.
