import pytest
from fastapi.testclient import TestClient


def test_project_crud_lifecycle(client: TestClient) -> None:
    create_response = client.post(
        "/projects",
        json={
            "name": "Personal Hub",
            "description": "Local productivity dashboard",
            "status": "Active",
            "progress": 35,
            "next_action": "Add regression tests",
            "deadline": "2026-10-31",
        },
    )

    assert create_response.status_code == 201
    created_project = create_response.json()
    assert created_project == {
        "id": 1,
        "name": "Personal Hub",
        "description": "Local productivity dashboard",
        "status": "Active",
        "progress": 35,
        "next_action": "Add regression tests",
        "deadline": "2026-10-31",
        "created_at": created_project["created_at"],
    }

    list_response = client.get("/projects")
    assert list_response.status_code == 200
    assert list_response.json() == [created_project]

    update_response = client.patch(
        "/projects/1",
        json={
            "status": "On hold",
            "progress": 75,
            "next_action": "Review test coverage",
            "deadline": None,
        },
    )
    assert update_response.status_code == 200
    assert update_response.json() == {
        **created_project,
        "status": "On hold",
        "progress": 75,
        "next_action": "Review test coverage",
        "deadline": None,
    }

    delete_response = client.delete("/projects/1")
    assert delete_response.status_code == 200
    assert delete_response.json() == {"status": "deleted"}
    assert client.get("/projects").json() == []


def test_missing_project_returns_404(client: TestClient) -> None:
    update_response = client.patch("/projects/999", json={"progress": 50})
    delete_response = client.delete("/projects/999")

    assert update_response.status_code == 404
    assert update_response.json() == {"detail": "Project not found"}
    assert delete_response.status_code == 404
    assert delete_response.json() == {"detail": "Project not found"}


@pytest.mark.parametrize("progress", [-1, 101])
def test_project_rejects_progress_outside_range(client: TestClient, progress: int) -> None:
    response = client.post(
        "/projects",
        json={
            "name": "Personal Hub",
            "description": "Local productivity dashboard",
            "status": "Active",
            "progress": progress,
            "next_action": "Validate progress",
            "deadline": None,
        },
    )

    assert response.status_code == 422
    assert client.get("/projects").json() == []


@pytest.mark.parametrize("field", ["name", "description", "next_action"])
def test_project_rejects_whitespace_required_values(client: TestClient, field: str) -> None:
    payload = {
        "name": "Personal Hub",
        "description": "Local productivity dashboard",
        "status": "Planning",
        "progress": 0,
        "next_action": "Validate required fields",
        "deadline": None,
    }
    payload[field] = "   "

    response = client.post("/projects", json=payload)

    assert response.status_code == 422
    assert client.get("/projects").json() == []
