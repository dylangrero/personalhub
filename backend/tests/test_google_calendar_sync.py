from datetime import datetime, timedelta, timezone
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.services import google_calendar_service


NOW = datetime(2026, 10, 6, 12, 0, tzinfo=timezone.utc)
CALENDAR_ID = "primary-calendar"


def timed_event(
    event_id: str = "google-event-1",
    **overrides: object,
) -> dict[str, Any]:
    event: dict[str, Any] = {
        "id": event_id,
        "summary": "Planning session",
        "description": "Prepare the weekly plan",
        "location": "Home office",
        "status": "confirmed",
        "updated": "2026-10-06T10:00:00Z",
        "start": {
            "dateTime": "2026-10-07T09:00:00+01:00",
            "timeZone": "Europe/London",
        },
        "end": {
            "dateTime": "2026-10-07T10:00:00+01:00",
            "timeZone": "Europe/London",
        },
    }
    event.update(overrides)
    return event


def snapshot(*events: dict[str, Any]) -> google_calendar_service.GoogleCalendarSnapshot:
    return google_calendar_service.GoogleCalendarSnapshot(
        calendar_id=CALENDAR_ID,
        calendar_timezone="Europe/London",
        events=list(events),
    )


def mock_snapshot(
    monkeypatch: pytest.MonkeyPatch,
    *events: dict[str, Any],
) -> None:
    monkeypatch.setattr(
        google_calendar_service,
        "fetch_primary_calendar_events",
        lambda time_min, time_max: snapshot(*events),
    )


def test_initial_sync_caches_timed_event_without_touching_local_events(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    local_event = client.post(
        "/events",
        json={
            "title": "Local appointment",
            "description": None,
            "start_time": "2026-10-07T14:00:00",
            "end_time": "2026-10-07T15:00:00",
            "location": None,
        },
    ).json()
    mock_snapshot(monkeypatch, timed_event())

    response = client.post("/integrations/google-calendar/sync")

    assert response.status_code == 200
    assert response.json() == {
        "fetched": 1,
        "created": 1,
        "updated": 0,
        "removed": 0,
        "unchanged": 0,
    }
    cached = client.get("/integrations/google-calendar/events").json()
    assert len(cached) == 1
    assert cached[0]["title"] == "Planning session"
    assert cached[0]["start_time"] == "2026-10-07T08:00:00Z"
    assert cached[0]["end_time"] == "2026-10-07T09:00:00Z"
    assert cached[0]["start_timezone"] == "Europe/London"
    assert client.get("/events").json() == [local_event]


def test_repeated_sync_is_idempotent(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    mock_snapshot(monkeypatch, timed_event())

    assert client.post("/integrations/google-calendar/sync").json()["created"] == 1
    second_response = client.post("/integrations/google-calendar/sync")

    assert second_response.json() == {
        "fetched": 1,
        "created": 0,
        "updated": 0,
        "removed": 0,
        "unchanged": 1,
    }
    assert len(client.get("/integrations/google-calendar/events").json()) == 1


def test_sync_updates_changed_google_event(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    mock_snapshot(monkeypatch, timed_event())
    client.post("/integrations/google-calendar/sync")
    mock_snapshot(
        monkeypatch,
        timed_event(
            summary="Updated planning session",
            updated="2026-10-06T11:00:00Z",
        ),
    )

    response = client.post("/integrations/google-calendar/sync")

    assert response.json()["updated"] == 1
    cached = client.get("/integrations/google-calendar/events").json()
    assert cached[0]["title"] == "Updated planning session"


def test_sync_reconciles_cancelled_and_missing_events(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    mock_snapshot(
        monkeypatch,
        timed_event("cancelled-event"),
        timed_event(
            "missing-event",
            start={"dateTime": "2026-10-08T09:00:00Z"},
            end={"dateTime": "2026-10-08T10:00:00Z"},
        ),
    )
    client.post("/integrations/google-calendar/sync")
    mock_snapshot(
        monkeypatch,
        {"id": "cancelled-event", "status": "cancelled"},
    )

    response = client.post("/integrations/google-calendar/sync")

    assert response.json()["removed"] == 2
    assert client.get("/integrations/google-calendar/events").json() == []


def test_sync_handles_all_day_and_missing_optional_fields(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    mock_snapshot(
        monkeypatch,
        {
            "id": "all-day-event",
            "status": "confirmed",
            "start": {"date": "2026-10-25"},
            "end": {"date": "2026-10-26"},
        },
    )

    response = client.post("/integrations/google-calendar/sync")

    assert response.status_code == 200
    cached = client.get("/integrations/google-calendar/events").json()[0]
    assert cached["title"] == "Untitled event"
    assert cached["description"] is None
    assert cached["location"] is None
    assert cached["is_all_day"] is True
    assert cached["start_date"] == "2026-10-25"
    assert cached["end_date"] == "2026-10-26"
    assert cached["start_time"] == "2026-10-24T23:00:00Z"
    assert cached["end_time"] == "2026-10-26T00:00:00Z"


def test_sync_requires_google_connection(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def raise_not_connected(*args: object) -> None:
        raise google_calendar_service.GoogleCalendarNotConnectedError(
            "Google Calendar is not connected"
        )

    monkeypatch.setattr(
        google_calendar_service,
        "fetch_primary_calendar_events",
        raise_not_connected,
    )

    response = client.post("/integrations/google-calendar/sync")

    assert response.status_code == 409
    assert response.json() == {"detail": "Google Calendar is not connected"}


def test_sync_requires_google_configuration(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def raise_not_configured(*args: object) -> None:
        raise google_calendar_service.GoogleCalendarConfigurationError(
            "Missing Google Calendar environment configuration"
        )

    monkeypatch.setattr(
        google_calendar_service,
        "fetch_primary_calendar_events",
        raise_not_configured,
    )

    response = client.post("/integrations/google-calendar/sync")

    assert response.status_code == 503
    assert response.json() == {
        "detail": "Missing Google Calendar environment configuration"
    }


class FakeRequest:
    def __init__(self, response: dict[str, Any]) -> None:
        self.response = response

    def execute(self) -> dict[str, Any]:
        return self.response


class FakeCalendars:
    def get(self, calendarId: str) -> FakeRequest:
        assert calendarId == "primary"
        return FakeRequest({"id": CALENDAR_ID, "timeZone": "Europe/London"})


class FakeEvents:
    def __init__(self) -> None:
        self.page_tokens: list[str | None] = []

    def list(self, **kwargs: object) -> FakeRequest:
        self.page_tokens.append(kwargs["pageToken"])
        assert kwargs["calendarId"] == "primary"
        assert kwargs["singleEvents"] is True
        assert kwargs["showDeleted"] is True
        if kwargs["pageToken"] is None:
            return FakeRequest(
                {"items": [timed_event("page-one")], "nextPageToken": "next"}
            )
        return FakeRequest({"items": [timed_event("page-two")]})


class FakeCalendarService:
    def __init__(self) -> None:
        self.events_resource = FakeEvents()

    def calendars(self) -> FakeCalendars:
        return FakeCalendars()

    def events(self) -> FakeEvents:
        return self.events_resource


def test_google_event_retrieval_follows_pagination(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    service = FakeCalendarService()
    monkeypatch.setattr(
        google_calendar_service,
        "_get_authenticated_calendar_service",
        lambda: service,
    )

    result = google_calendar_service.fetch_primary_calendar_events(
        NOW - timedelta(days=30),
        NOW + timedelta(days=365),
    )

    assert [event["id"] for event in result.events] == ["page-one", "page-two"]
    assert service.events_resource.page_tokens == [None, "next"]
