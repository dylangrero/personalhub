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
The `/today` aggregation merges active cached Google events with local Events
for presentation only. Google entries remain identified as read-only, while
local Events retain their existing create, edit, and delete behaviour. V1 sync
continues to be triggered manually from the dashboard.

## AI
AI is not required for the core application.

The application should work fully without AI.
AI will later interpret structured data from the backend.

## Today dashboard v2
The shared shell uses anchor navigation to existing Today, Tasks, Projects, and
Schedule sections. Search filters the data already loaded through `/today`.
Quick actions open the existing management forms rather than separate workflows.

Daily Focus selects the oldest overdue task first, then a task due today, then
another high-priority task. Overdue/high-priority groups sort by due date,
priority (High, Medium, Low), and ID; today's tasks sort by priority and ID.
Task category is shown because task/project relationships do not exist yet.

The momentum panel shows current priority counts, scheduled events, active
projects, and the mean of their actual progress percentages. It does not claim
weekly completion or focus-time statistics because those are not recorded.
The schedule uses source-local times, separate rows for overlapping events,
and a minute-updated local clock indicator during scheduled hours. This clock
does not poll the API or trigger Calendar sync.
