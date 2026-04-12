from __future__ import annotations

import json
import os
from typing import Any, Dict

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.oauth2 import service_account


SCOPES = ["https://www.googleapis.com/auth/calendar"]


class GoogleCalendarService:
    """
    Thin wrapper around the Google Calendar API using a service account.
    """

    def __init__(self) -> None:
        # Prefer inline JSON via GOOGLE_SERVICE_ACCOUNT_JSON.
        # For local development, GOOGLE_SERVICE_ACCOUNT_FILE can point to a JSON file path.
        service_account_json = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
        service_account_file = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE")

        if not service_account_json and service_account_file:
            with open(service_account_file, "r", encoding="utf-8") as f:
                service_account_json = f.read()

        calendar_id = os.getenv("GOOGLE_CALENDAR_ID")

        # If credentials or calendar ID are missing, keep the service disabled
        # so that the Flask app can still start. The export endpoint will then
        # return a clear error when called.
        if not service_account_json or not calendar_id:
            self._calendar_id = None
            self._service = None
            self._configured = False
            return

        info = json.loads(service_account_json)
        credentials = service_account.Credentials.from_service_account_info(
            info, scopes=SCOPES
        )

        self._calendar_id = calendar_id
        self._service = build(
            "calendar",
            "v3",
            credentials=credentials,
            cache_discovery=False,
        )
        self._configured = True

    def create_event(
        self,
        title: str,
        start: str,
        end: str,
        description: str | None = None,
        location: str | None = None,
        timezone: str | None = None,
    ) -> Dict[str, Any]:
        """
        Create an event on the shared NGO calendar.

        `start` and `end` must be ISO 8601 / RFC3339 strings.
        """
        if not getattr(self, "_configured", False) or not self._service or not self._calendar_id:
            raise RuntimeError(
                "Google Calendar API is not configured. "
                "Set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_FILE "
                "and GOOGLE_CALENDAR_ID environment variables."
            )
        tz = timezone or os.getenv("DEFAULT_TIMEZONE", "UTC")

        body: Dict[str, Any] = {
            "summary": title,
            "start": {"dateTime": start, "timeZone": tz},
            "end": {"dateTime": end, "timeZone": tz},
        }
        if description:
            body["description"] = description
        if location:
            body["location"] = location

        try:
            return (
                self._service.events()
                .insert(calendarId=self._calendar_id, body=body)
                .execute()
            )
        except HttpError as exc:  # noqa: BLE001
            raise RuntimeError(f"Google Calendar create_event failed: {exc}") from exc

    def update_event(
        self,
        event_id: str,
        title: str | None = None,
        start: str | None = None,
        end: str | None = None,
        description: str | None = None,
        location: str | None = None,
        timezone: str | None = None,
    ) -> Dict[str, Any]:
        """
        Update an existing event on the shared NGO calendar.
        """
        if not getattr(self, "_configured", False) or not self._service or not self._calendar_id:
            raise RuntimeError(
                "Google Calendar API is not configured. "
                "Set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_FILE "
                "and GOOGLE_CALENDAR_ID environment variables."
            )
        tz = timezone or os.getenv("DEFAULT_TIMEZONE", "UTC")

        try:
            event = (
                self._service.events()
                .get(calendarId=self._calendar_id, eventId=event_id)
                .execute()
            )
        except HttpError as exc:  # noqa: BLE001
            raise RuntimeError(f"Google Calendar get event failed: {exc}") from exc

        if title:
            event["summary"] = title
        if description is not None:
            event["description"] = description
        if location is not None:
            event["location"] = location
        if start:
            event.setdefault("start", {})
            event["start"]["dateTime"] = start
            event["start"]["timeZone"] = tz
        if end:
            event.setdefault("end", {})
            event["end"]["dateTime"] = end
            event["end"]["timeZone"] = tz

        try:
            return (
                self._service.events()
                .update(calendarId=self._calendar_id, eventId=event_id, body=event)
                .execute()
            )
        except HttpError as exc:  # noqa: BLE001
            raise RuntimeError(f"Google Calendar update_event failed: {exc}") from exc

