import pytest
from fastapi.testclient import TestClient


def event_payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "title": "Weekly planning",
        "description": "Plan the next seven days",
        "start_time": "2026-10-05T09:30:00",
        "end_time": "2026-10-05T10:15:00",
        "location": "Home office",
    }
    payload.update(overrides)
    return payload


def test_event_crud_lifecycle(client: TestClient) -> None:
    create_response = client.post("/events", json=event_payload())

    assert create_response.status_code == 201
    created_event = create_response.json()
    assert created_event == {
        "id": 1,
        "title": "Weekly planning",
        "description": "Plan the next seven days",
        "start_time": "2026-10-05T09:30:00",
        "end_time": "2026-10-05T10:15:00",
        "location": "Home office",
        "created_at": created_event["created_at"],
    }

    list_response = client.get("/events")
    assert list_response.status_code == 200
    assert list_response.json() == [created_event]

    update_response = client.patch(
        "/events/1",
        json={
            "title": "Updated weekly planning",
            "description": None,
            "start_time": "2026-10-05T10:00:00",
            "end_time": "2026-10-05T11:00:00",
            "location": None,
        },
    )
    assert update_response.status_code == 200
    updated_event = update_response.json()
    assert updated_event == {
        **created_event,
        "title": "Updated weekly planning",
        "description": None,
        "start_time": "2026-10-05T10:00:00",
        "end_time": "2026-10-05T11:00:00",
        "location": None,
    }
    assert client.get("/events").json() == [updated_event]

    delete_response = client.delete("/events/1")
    assert delete_response.status_code == 200
    assert delete_response.json() == {"status": "deleted"}
    assert client.get("/events").json() == []


def test_events_are_listed_chronologically(client: TestClient) -> None:
    later_event = client.post(
        "/events",
        json=event_payload(
            title="Afternoon review",
            start_time="2026-10-05T15:00:00",
            end_time="2026-10-05T15:30:00",
        ),
    ).json()
    earlier_event = client.post(
        "/events",
        json=event_payload(
            title="Morning focus",
            start_time="2026-10-05T08:00:00",
            end_time="2026-10-05T09:00:00",
        ),
    ).json()

    response = client.get("/events")

    assert response.status_code == 200
    assert response.json() == [earlier_event, later_event]


def test_missing_event_returns_404(client: TestClient) -> None:
    update_response = client.patch("/events/999", json={"title": "Missing"})
    delete_response = client.delete("/events/999")

    assert update_response.status_code == 404
    assert update_response.json() == {"detail": "Event not found"}
    assert delete_response.status_code == 404
    assert delete_response.json() == {"detail": "Event not found"}


def test_event_rejects_whitespace_title(client: TestClient) -> None:
    response = client.post("/events", json=event_payload(title="   "))

    assert response.status_code == 422
    assert client.get("/events").json() == []


@pytest.mark.parametrize(
    "end_time",
    ["2026-10-05T09:00:00", "2026-10-05T09:30:00"],
)
def test_event_rejects_invalid_create_range(client: TestClient, end_time: str) -> None:
    response = client.post("/events", json=event_payload(end_time=end_time))

    assert response.status_code == 422
    assert client.get("/events").json() == []


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("end_time", "2026-10-05T09:00:00"),
        ("start_time", "2026-10-05T10:15:00"),
    ],
)
def test_event_rejects_invalid_partial_update_range(
    client: TestClient,
    field: str,
    value: str,
) -> None:
    client.post("/events", json=event_payload())

    response = client.patch("/events/1", json={field: value})

    assert response.status_code == 422
    stored_event = client.get("/events").json()[0]
    assert stored_event["start_time"] == "2026-10-05T09:30:00"
    assert stored_event["end_time"] == "2026-10-05T10:15:00"
