from datetime import date
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.services import google_calendar_service


def create_task(client: TestClient, **overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "title": "Today task",
        "category": "Personal",
        "priority": "Medium",
        "status": "To do",
        "due_date": None,
    }
    payload.update(overrides)
    response = client.post("/tasks", json=payload)
    assert response.status_code == 201
    return response.json()


def create_event(client: TestClient, **overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "title": "Today event",
        "description": None,
        "start_time": "2026-10-05T09:00:00",
        "end_time": "2026-10-05T10:00:00",
        "location": None,
    }
    payload.update(overrides)
    response = client.post("/events", json=payload)
    assert response.status_code == 201
    return response.json()


def create_project(client: TestClient, **overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "name": "Personal Hub",
        "description": "Local productivity dashboard",
        "status": "Active",
        "progress": 50,
        "next_action": "Build the Today endpoint",
        "deadline": None,
    }
    payload.update(overrides)
    response = client.post("/projects", json=payload)
    assert response.status_code == 201
    return response.json()


def today_local_event(event: dict[str, object]) -> dict[str, object]:
    return {
        **event,
        "source": "local",
        "is_all_day": False,
        "source_timezone": None,
    }


def cache_google_events(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    *events: dict[str, Any],
) -> None:
    monkeypatch.setattr(
        google_calendar_service,
        "fetch_primary_calendar_events",
        lambda time_min, time_max: google_calendar_service.GoogleCalendarSnapshot(
            calendar_id="primary-calendar",
            calendar_timezone="Europe/London",
            events=list(events),
        ),
    )
    response = client.post("/integrations/google-calendar/sync")
    assert response.status_code == 200


def google_timed_event(
    event_id: str,
    title: str,
    start: str,
    end: str,
) -> dict[str, Any]:
    return {
        "id": event_id,
        "summary": title,
        "status": "confirmed",
        "start": {"dateTime": start, "timeZone": "Europe/London"},
        "end": {"dateTime": end, "timeZone": "Europe/London"},
    }


def test_today_returns_empty_collections_for_explicit_date(client: TestClient) -> None:
    response = client.get("/today?date=2026-10-05")

    assert response.status_code == 200
    assert response.json() == {
        "date": "2026-10-05",
        "events": [],
        "due_tasks": [],
        "overdue_tasks": [],
        "high_priority_tasks": [],
        "active_projects": [],
        "summary": {
            "event_count": 0,
            "due_task_count": 0,
            "overdue_task_count": 0,
            "high_priority_task_count": 0,
            "active_project_count": 0,
        },
    }


def test_today_uses_server_local_date_when_date_is_omitted(client: TestClient) -> None:
    response = client.get("/today")

    assert response.status_code == 200
    assert response.json()["date"] == date.today().isoformat()


def test_today_aggregates_and_classifies_existing_data(client: TestClient) -> None:
    later_event = create_event(
        client,
        title="Afternoon review",
        start_time="2026-10-05T15:00:00",
        end_time="2026-10-05T15:30:00",
    )
    earlier_event = create_event(
        client,
        title="Morning focus",
        start_time="2026-10-05T08:00:00",
        end_time="2026-10-05T09:00:00",
    )
    create_event(
        client,
        title="Another day",
        start_time="2026-10-06T08:00:00",
        end_time="2026-10-06T09:00:00",
    )

    due_task = create_task(client, title="Due today", due_date="2026-10-05")
    high_due_task = create_task(
        client,
        title="High and due",
        priority="High",
        due_date="2026-10-05",
    )
    create_task(
        client,
        title="Completed due task",
        status="Done",
        due_date="2026-10-05",
    )
    recent_overdue_task = create_task(
        client,
        title="Recently overdue",
        due_date="2026-10-04",
    )
    older_overdue_task = create_task(
        client,
        title="Older overdue",
        due_date="2026-10-01",
    )
    create_task(
        client,
        title="Completed overdue task",
        status="Done",
        due_date="2026-10-02",
    )
    future_high_task = create_task(
        client,
        title="Future high priority",
        priority="High",
        due_date="2026-10-06",
    )
    undated_high_task = create_task(
        client,
        title="Undated high priority",
        priority="High",
    )
    create_task(
        client,
        title="Completed high priority",
        priority="High",
        status="Done",
    )

    active_project = create_project(client, name="Active project")
    planning_project = create_project(client, name="Planning project", status="Planning")
    create_project(client, name="Completed project", status="Completed", progress=100)

    response = client.get("/today?date=2026-10-05")

    assert response.status_code == 200
    today = response.json()
    assert today["date"] == "2026-10-05"
    assert today["events"] == [
        today_local_event(earlier_event),
        today_local_event(later_event),
    ]
    assert today["due_tasks"] == [due_task, high_due_task]
    assert today["overdue_tasks"] == [older_overdue_task, recent_overdue_task]
    assert today["high_priority_tasks"] == [future_high_task, undated_high_task]
    assert high_due_task not in today["high_priority_tasks"]
    assert today["active_projects"] == [active_project, planning_project]
    assert today["summary"] == {
        "event_count": len(today["events"]),
        "due_task_count": len(today["due_tasks"]),
        "overdue_task_count": len(today["overdue_tasks"]),
        "high_priority_task_count": len(today["high_priority_tasks"]),
        "active_project_count": len(today["active_projects"]),
    }


def test_today_rejects_invalid_date(client: TestClient) -> None:
    response = client.get("/today?date=not-a-date")

    assert response.status_code == 422


def test_today_returns_google_events(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    cache_google_events(
        client,
        monkeypatch,
        google_timed_event(
            "google-morning",
            "Google morning meeting",
            "2026-10-05T09:00:00+01:00",
            "2026-10-05T10:00:00+01:00",
        ),
    )

    response = client.get("/today?date=2026-10-05")

    assert response.status_code == 200
    events = response.json()["events"]
    assert len(events) == 1
    assert events[0] == {
        "id": "google-morning",
        "title": "Google morning meeting",
        "description": None,
        "start_time": "2026-10-05T08:00:00Z",
        "end_time": "2026-10-05T09:00:00Z",
        "location": None,
        "is_all_day": False,
        "source_timezone": "Europe/London",
        "source": "google",
        "created_at": None,
    }


def test_today_combines_sources_in_chronological_order(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    create_event(
        client,
        title="Local mid-morning focus",
        start_time="2026-10-05T10:30:00",
        end_time="2026-10-05T11:00:00",
    )
    cache_google_events(
        client,
        monkeypatch,
        google_timed_event(
            "google-early",
            "Google early meeting",
            "2026-10-05T09:00:00+01:00",
            "2026-10-05T09:30:00+01:00",
        ),
        google_timed_event(
            "google-late",
            "Google afternoon meeting",
            "2026-10-05T14:00:00+01:00",
            "2026-10-05T15:00:00+01:00",
        ),
    )

    today = client.get("/today?date=2026-10-05").json()

    assert [event["title"] for event in today["events"]] == [
        "Google early meeting",
        "Local mid-morning focus",
        "Google afternoon meeting",
    ]
    assert [event["source"] for event in today["events"]] == [
        "google",
        "local",
        "google",
    ]
    assert today["summary"]["event_count"] == 3


def test_today_excludes_cancelled_google_event(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    cache_google_events(
        client,
        monkeypatch,
        google_timed_event(
            "cancelled-google-event",
            "Cancelled meeting",
            "2026-10-05T09:00:00+01:00",
            "2026-10-05T10:00:00+01:00",
        ),
    )
    cache_google_events(
        client,
        monkeypatch,
        {"id": "cancelled-google-event", "status": "cancelled"},
    )

    today = client.get("/today?date=2026-10-05").json()

    assert today["events"] == []
    assert today["summary"]["event_count"] == 0


def test_today_places_all_day_google_event_before_timed_events_and_excludes_other_dates(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    create_event(
        client,
        title="Local morning event",
        start_time="2026-10-05T08:00:00",
        end_time="2026-10-05T09:00:00",
    )
    cache_google_events(
        client,
        monkeypatch,
        {
            "id": "all-day-google-event",
            "summary": "Google all day",
            "status": "confirmed",
            "start": {"date": "2026-10-05"},
            "end": {"date": "2026-10-06"},
        },
        google_timed_event(
            "other-date",
            "Tomorrow's Google event",
            "2026-10-06T09:00:00+01:00",
            "2026-10-06T10:00:00+01:00",
        ),
    )

    events = client.get("/today?date=2026-10-05").json()["events"]

    assert [event["title"] for event in events] == [
        "Google all day",
        "Local morning event",
    ]
    assert events[0]["source"] == "google"
    assert events[0]["is_all_day"] is True
