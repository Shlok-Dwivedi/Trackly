from __future__ import annotations

from flask import Blueprint, jsonify, request

from services.firebase_admin import initialize_firebase_app, verify_id_token
from services.google_calendar import GoogleCalendarService


calendar_bp = Blueprint("calendar", __name__, url_prefix="/api/calendar")

# Ensure Firebase Admin and Google Calendar client are initialized.
initialize_firebase_app()
calendar_service = GoogleCalendarService()


def _extract_bearer_token() -> str:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise ValueError("Missing or invalid Authorization header")
    return auth_header.split(" ", 1)[1].strip()


@calendar_bp.route("/export", methods=["POST"])
def export_event():
    """
    POST /api/calendar/export

    Creates or updates an event on the shared NGO Google Calendar.

    Body JSON (minimal contract):
      {
        "title": "Event title",
        "description": "Optional description",
        "location": "Optional location",
        "start": "2026-02-20T10:00:00Z",  # ISO 8601 / RFC3339 string
        "end": "2026-02-20T12:00:00Z",
        "googleCalendarEventId": "optional-existing-id"  # if provided, update instead of create
      }

    Authorization:
      - Requires a Firebase ID token in the Authorization header.
      - Any authenticated user can export; front-end should gate by role.
    """
    data = request.get_json(silent=True) or {}

    title = data.get("title")
    start = data.get("start")
    end = data.get("end")
    description = data.get("description")
    location = data.get("location")
    existing_event_id = data.get("googleCalendarEventId")

    if not title or not start or not end:
        return jsonify({"error": "title, start, and end are required"}), 400

    # Verify caller is authenticated. Role-based gating is enforced in the frontend.
    try:
        id_token = _extract_bearer_token()
        verify_id_token(id_token)
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": "Unauthorized", "details": str(exc)}), 401

    try:
        if existing_event_id:
            event = calendar_service.update_event(
                existing_event_id,
                title=title,
                start=start,
                end=end,
                description=description,
                location=location,
            )
        else:
            event = calendar_service.create_event(
                title=title,
                start=start,
                end=end,
                description=description,
                location=location,
            )

        return (
            jsonify(
                {
                    "eventId": event.get("id"),
                    "htmlLink": event.get("htmlLink"),
                    "status": "success",
                }
            ),
            200,
        )
    except Exception as exc:  # noqa: BLE001
        return (
            jsonify(
                {
                    "error": "Failed to export event to Google Calendar",
                    "details": str(exc),
                }
            ),
            500,
        )

