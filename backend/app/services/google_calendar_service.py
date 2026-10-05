import hmac
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

CALENDAR_READONLY_SCOPE = "https://www.googleapis.com/auth/calendar.readonly"
SCOPES = [CALENDAR_READONLY_SCOPE]


class GoogleCalendarConfigurationError(RuntimeError):
    pass


class GoogleCalendarStateError(RuntimeError):
    pass


class GoogleCalendarOAuthError(RuntimeError):
    pass


@dataclass(frozen=True)
class GoogleCalendarSettings:
    client_id: str
    client_secret: str
    redirect_uri: str
    token_path: Path

    @property
    def state_path(self) -> Path:
        return self.token_path.with_suffix(".state.json")


def get_settings() -> GoogleCalendarSettings:
    environment = {
        "client_id": os.getenv("GOOGLE_CLIENT_ID"),
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
        "redirect_uri": os.getenv("GOOGLE_REDIRECT_URI"),
        "token_path": os.getenv("GOOGLE_CALENDAR_TOKEN_PATH"),
    }
    missing = [name for name, value in environment.items() if not value]
    if missing:
        names = ", ".join(sorted(missing))
        raise GoogleCalendarConfigurationError(
            f"Missing Google Calendar environment configuration: {names}"
        )

    return GoogleCalendarSettings(
        client_id=environment["client_id"] or "",
        client_secret=environment["client_secret"] or "",
        redirect_uri=environment["redirect_uri"] or "",
        token_path=Path(environment["token_path"] or "").expanduser().resolve(),
    )


def get_connection_status() -> dict[str, bool]:
    try:
        settings = get_settings()
    except GoogleCalendarConfigurationError:
        return {"configured": False, "connected": False}

    if not settings.token_path.is_file():
        return {"configured": True, "connected": False}

    try:
        credentials = Credentials.from_authorized_user_file(settings.token_path, SCOPES)
    except (OSError, ValueError, json.JSONDecodeError):
        return {"configured": True, "connected": False}

    return {
        "configured": True,
        "connected": bool(credentials.token and credentials.refresh_token),
    }


def start_connection() -> str:
    settings = get_settings()
    flow = _create_flow(settings)
    authorization_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    if not flow.code_verifier:
        raise GoogleCalendarOAuthError("Google OAuth PKCE setup failed")

    _write_private_json(
        settings.state_path,
        json.dumps({"state": state, "code_verifier": flow.code_verifier}),
    )
    return authorization_url


def finish_connection(state: str, code: str) -> dict[str, str | None]:
    settings = get_settings()
    expected_state, code_verifier = _read_pending_authorization(settings.state_path)
    if not hmac.compare_digest(state, expected_state):
        raise GoogleCalendarStateError("OAuth state did not match")

    settings.state_path.unlink(missing_ok=True)
    flow = _create_flow(settings, state=state, code_verifier=code_verifier)

    try:
        flow.fetch_token(code=code)
        credentials = flow.credentials
    except Exception as error:
        raise GoogleCalendarOAuthError("Google OAuth token exchange failed") from error

    if not credentials.refresh_token:
        raise GoogleCalendarOAuthError("Google did not return an offline refresh token")

    calendar = _verify_calendar_access(credentials)
    _write_private_json(settings.token_path, credentials.to_json())
    return {
        "status": "connected",
        "calendar_id": str(calendar.get("id", "primary")),
        "calendar_summary": calendar.get("summary"),
    }


def disconnect() -> None:
    settings = get_settings()
    settings.token_path.unlink(missing_ok=True)
    settings.state_path.unlink(missing_ok=True)


def _create_flow(
    settings: GoogleCalendarSettings,
    state: str | None = None,
    code_verifier: str | None = None,
) -> Flow:
    client_config = {
        "web": {
            "client_id": settings.client_id,
            "client_secret": settings.client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [settings.redirect_uri],
        }
    }
    return Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        redirect_uri=settings.redirect_uri,
        state=state,
        code_verifier=code_verifier,
        autogenerate_code_verifier=code_verifier is None,
    )


def _read_pending_authorization(state_path: Path) -> tuple[str, str]:
    try:
        pending_authorization = json.loads(state_path.read_text(encoding="utf-8"))
        stored_state = pending_authorization["state"]
        code_verifier = pending_authorization["code_verifier"]
    except (FileNotFoundError, KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
        raise GoogleCalendarStateError("No valid OAuth connection attempt is pending") from error

    if (
        not isinstance(stored_state, str)
        or not stored_state
        or not isinstance(code_verifier, str)
        or not code_verifier
    ):
        raise GoogleCalendarStateError("No valid OAuth connection attempt is pending")
    return stored_state, code_verifier


def _verify_calendar_access(credentials: Credentials) -> dict[str, Any]:
    try:
        calendar_service = build(
            "calendar",
            "v3",
            credentials=credentials,
            cache_discovery=False,
        )
        return calendar_service.calendars().get(calendarId="primary").execute()
    except Exception as error:
        raise GoogleCalendarOAuthError(
            "Google Calendar verification request failed"
        ) from error


def _write_private_json(path: Path, content: str) -> None:
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    temporary_path = path.with_suffix(f"{path.suffix}.tmp")
    temporary_path.write_text(content, encoding="utf-8")
    try:
        temporary_path.chmod(0o600)
    except OSError:
        pass
    temporary_path.replace(path)
