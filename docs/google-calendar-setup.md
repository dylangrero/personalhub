# Google Calendar OAuth setup

Personal Hub uses Google's OAuth 2.0 web-server flow with read-only Calendar access.
It does not import or synchronize Google events yet.

## Google Cloud configuration

1. Create or select a Google Cloud project.
2. Enable the **Google Calendar API** for that project.
3. Configure the OAuth consent screen. While the app remains in testing, add your
   Google account as a test user.
4. Create an OAuth client ID with application type **Web application**.
5. Add this exact authorized redirect URI:

   `http://localhost:8000/integrations/google-calendar/callback`

Do not download or commit a client secret file. Personal Hub reads the client ID
and client secret from environment variables.

## Local environment

Copy the safe template to the local backend environment file if `.env` does not
already exist:

```powershell
Copy-Item .env.example .env
```

Edit `backend/.env` locally and supply the Google OAuth client ID and client
secret. The redirect URI must remain:

`http://localhost:8000/integrations/google-calendar/callback`

`backend/.env` is local-only and gitignored. `backend/.env.example` contains
placeholders only and is safe to commit. Real operating-system environment
variables take precedence over `.env`, so deployment or one-off shell values can
still override local defaults.

The OAuth token remains at `.secrets/google_calendar_token.json`. That file
contains a refresh token, is sensitive, and is protected by the gitignored
`backend/.secrets/` directory. Never copy real credentials or tokens into the
template, documentation, or source files.

After starting FastAPI, open:

`http://localhost:8000/integrations/google-calendar/connect`

The callback exchanges the authorization code, verifies read-only access by
requesting the primary calendar metadata, and then stores the OAuth token.
Connection state is available from `GET /integrations/google-calendar/status`.

## Local security limits

The token file contains a refresh token and is not encrypted. Personal Hub makes
a best-effort attempt to restrict file permissions, but the local operating-system
account remains the security boundary. The V1 backend has no application
authentication, so these connection endpoints must not be exposed publicly.
