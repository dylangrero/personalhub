import pytest
from fastapi.testclient import TestClient


def test_health(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_task_crud_lifecycle(client: TestClient) -> None:
    create_response = client.post(
        "/tasks",
        json={
            "title": "Prepare weekly plan",
            "category": "Personal",
            "priority": "High",
            "status": "To do",
            "due_date": "2026-10-12",
        },
    )

    assert create_response.status_code == 201
    created_task = create_response.json()
    assert created_task == {
        "id": 1,
        "title": "Prepare weekly plan",
        "category": "Personal",
        "priority": "High",
        "status": "To do",
        "due_date": "2026-10-12",
        "created_at": created_task["created_at"],
    }

    list_response = client.get("/tasks")
    assert list_response.status_code == 200
    assert list_response.json() == [created_task]

    update_response = client.patch(
        "/tasks/1",
        json={"title": "Prepare next week", "status": "Done", "due_date": None},
    )
    assert update_response.status_code == 200
    assert update_response.json() == {
        **created_task,
        "title": "Prepare next week",
        "status": "Done",
        "due_date": None,
    }

    delete_response = client.delete("/tasks/1")
    assert delete_response.status_code == 200
    assert delete_response.json() == {"status": "deleted"}
    assert client.get("/tasks").json() == []


def test_missing_task_returns_404(client: TestClient) -> None:
    update_response = client.patch("/tasks/999", json={"status": "Done"})
    delete_response = client.delete("/tasks/999")

    assert update_response.status_code == 404
    assert update_response.json() == {"detail": "Task not found"}
    assert delete_response.status_code == 404
    assert delete_response.json() == {"detail": "Task not found"}


@pytest.mark.parametrize("field", ["title", "category"])
def test_task_rejects_whitespace_required_values(client: TestClient, field: str) -> None:
    payload = {
        "title": "Valid title",
        "category": "Personal",
        "priority": "Medium",
        "status": "To do",
        "due_date": None,
    }
    payload[field] = "   "

    response = client.post("/tasks", json=payload)

    assert response.status_code == 422
    assert client.get("/tasks").json() == []
