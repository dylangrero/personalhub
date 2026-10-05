import json
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.services import google_calendar_service


class FakeCredentials:
    token = "access-token"
    refresh_token = "refresh-token"

    def to_json(self) -> str:
        return json.dumps(
            {
                "token": self.token,
                "refresh_token": self.refresh_token,
                "token_uri": "https://oauth2.googleapis.com/token",
                "client_id": "test-client-id",
                "client_secret": "test-client-secret",
                "scopes": google_calendar_service.SCOPES,
            }
        )


class FakeFlow:
    credentials = FakeCredentials()
    fetch_codes: list[str] = []
    fetch_code_verifiers: list[str | None] = []
    authorization_options: dict[str, str] = {}

    def __init__(self, code_verifier: str | None = None) -> None:
        self.code_verifier = code_verifier

    @classmethod
    def from_client_config(
        cls,
        client_config: dict[str, Any],
        scopes: list[str],
        **kwargs: str | None,
    ) -> "FakeFlow":
        assert client_config["web"]["client_id"] == "test-client-id"
        assert scopes == [google_calendar_service.CALENDAR_READONLY_SCOPE]
        assert kwargs["redirect_uri"] == (
            "http://localhost:8000/integrations/google-calendar/callback"
        )
        return cls(code_verifier=kwargs.get("code_verifier"))

    def authorization_url(self, **kwargs: str) -> tuple[str, str]:
        type(self).authorization_options = kwargs
        self.code_verifier = "test-code-verifier"
        return "https://accounts.google.test/authorize", "oauth-state"

    def fetch_token(self, code: str) -> None:
        type(self).fetch_codes.append(code)
        type(self).fetch_code_verifiers.append(self.code_verifier)


class FakeCalendarRequest:
    def execute(self) -> dict[str, str]:
        return {"id": "primary", "summary": "Personal calendar"}


class FakeCalendars:
    requested_calendar_id: str | None = None

    def get(self, calendarId: str) -> FakeCalendarRequest:
        type(self).requested_calendar_id = calendarId
        return FakeCalendarRequest()


class FakeCalendarService:
    def calendars(self) -> FakeCalendars:
        return FakeCalendars()


@pytest.fixture
def google_environment(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> Path:
    token_path = tmp_path / ".secrets" / "google_calendar_token.json"
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-client-id")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "test-client-secret")
    monkeypatch.setenv(
        "GOOGLE_REDIRECT_URI",
        "http://localhost:8000/integrations/google-calendar/callback",
    )
    monkeypatch.setenv("GOOGLE_CALENDAR_TOKEN_PATH", str(token_path))
    monkeypatch.setattr(google_calendar_service, "Flow", FakeFlow)
    monkeypatch.setattr(
        google_calendar_service,
        "build",
        lambda *args, **kwargs: FakeCalendarService(),
    )
    FakeFlow.fetch_codes = []
    FakeFlow.fetch_code_verifiers = []
    FakeFlow.authorization_options = {}
    FakeCalendars.requested_calendar_id = None
    return token_path


def test_status_reports_missing_configuration(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    for name in (
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
        "GOOGLE_REDIRECT_URI",
        "GOOGLE_CALENDAR_TOKEN_PATH",
    ):
        monkeypatch.delenv(name, raising=False)

    response = client.get("/integrations/google-calendar/status")

    assert response.status_code == 200
    assert response.json() == {"configured": False, "connected": False}


def test_connect_uses_read_only_offline_oauth(
    client: TestClient,
    google_environment: Path,
) -> None:
    response = client.get("/integrations/google-calendar/connect", follow_redirects=False)

    assert response.status_code == 307
    assert response.headers["location"] == "https://accounts.google.test/authorize"
    assert FakeFlow.authorization_options == {
        "access_type": "offline",
        "include_granted_scopes": "true",
        "prompt": "consent",
    }
    state_path = google_environment.with_suffix(".state.json")
    assert json.loads(state_path.read_text(encoding="utf-8")) == {
        "state": "oauth-state",
        "code_verifier": "test-code-verifier",
    }


def test_callback_verifies_calendar_and_stores_refresh_token(
    client: TestClient,
    google_environment: Path,
) -> None:
    client.get("/integrations/google-calendar/connect", follow_redirects=False)

    response = client.get(
        "/integrations/google-calendar/callback",
        params={"state": "oauth-state", "code": "authorization-code"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "status": "connected",
        "calendar_id": "primary",
        "calendar_summary": "Personal calendar",
    }
    assert FakeFlow.fetch_codes == ["authorization-code"]
    assert FakeFlow.fetch_code_verifiers == ["test-code-verifier"]
    assert FakeCalendars.requested_calendar_id == "primary"
    assert json.loads(google_environment.read_text(encoding="utf-8"))[
        "refresh_token"
    ] == "refresh-token"
    assert client.get("/integrations/google-calendar/status").json() == {
        "configured": True,
        "connected": True,
    }


def test_callback_rejects_invalid_state(
    client: TestClient,
    google_environment: Path,
) -> None:
    client.get("/integrations/google-calendar/connect", follow_redirects=False)

    response = client.get(
        "/integrations/google-calendar/callback",
        params={"state": "wrong-state", "code": "authorization-code"},
    )

    assert response.status_code == 400
    assert not google_environment.exists()
    assert FakeFlow.fetch_codes == []


def test_failed_calendar_verification_does_not_store_token(
    client: TestClient,
    google_environment: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client.get("/integrations/google-calendar/connect", follow_redirects=False)
    monkeypatch.setattr(
        google_calendar_service,
        "build",
        lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("network failure")),
    )

    response = client.get(
        "/integrations/google-calendar/callback",
        params={"state": "oauth-state", "code": "authorization-code"},
    )

    assert response.status_code == 502
    assert response.json() == {"detail": "Google Calendar verification request failed"}
    assert not google_environment.exists()


def test_disconnect_removes_local_credentials(
    client: TestClient,
    google_environment: Path,
) -> None:
    google_environment.parent.mkdir(parents=True)
    google_environment.write_text(FakeCredentials().to_json(), encoding="utf-8")

    response = client.delete("/integrations/google-calendar/disconnect")

    assert response.status_code == 200
    assert response.json() == {"status": "disconnected"}
    assert not google_environment.exists()
    assert client.get("/integrations/google-calendar/status").json() == {
        "configured": True,
        "connected": False,
    }
