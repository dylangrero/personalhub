from datetime import date

from fastapi.testclient import TestClient


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
    assert today["events"] == [earlier_event, later_event]
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
