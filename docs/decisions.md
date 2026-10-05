# Project Decisions

## V1 scope
Keep V1 small and local-first.

## Authentication
No authentication for V1.

## Database
Use SQLite initially.

## Calendar
Build internal events first.
Google Calendar connection uses Google's OAuth 2.0 web-server flow with
read-only access. For local single-user V1, the refresh token is stored in a
gitignored local file. Importing Google events remains a separate later step.

## AI
AI is not required for the core application.

The application should work fully without AI.
AI will later interpret structured data from the backend.
