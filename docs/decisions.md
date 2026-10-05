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
gitignored local file.

Google Calendar events are synchronized into a separate local cache table,
rather than merged into the user-managed Event table. Sync is manual and
read-only, covers 30 days in the past through 365 days in the future, and
reconciles updates and removed events by their stable Google identity. This
keeps Google-owned data distinct and leaves existing local Events untouched.

## AI
AI is not required for the core application.

The application should work fully without AI.
AI will later interpret structured data from the backend.
