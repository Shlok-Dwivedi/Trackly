from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict

import firebase_admin
from firebase_admin import auth, credentials, firestore, messaging


_firebase_app: firebase_admin.App | None = None

# Backend directory (parent of services/)
_BACKEND_DIR = Path(__file__).resolve().parent.parent


def initialize_firebase_app() -> firebase_admin.App:
    """
    Initialize the Firebase Admin SDK singleton using a service account JSON
    loaded from the GOOGLE_SERVICE_ACCOUNT_JSON environment variable.
    """
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    # Prefer inline JSON via GOOGLE_SERVICE_ACCOUNT_JSON.
    # For local development, GOOGLE_SERVICE_ACCOUNT_FILE can point to a JSON file path.
    service_account_json = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
    service_account_file = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE")

    if not service_account_json and service_account_file:
        # Resolve relative paths from backend directory
        path = Path(service_account_file)
        if not path.is_absolute():
            path = _BACKEND_DIR / path
        with open(path, "r", encoding="utf-8") as f:
            service_account_json = f.read()

    if not service_account_json:
        raise RuntimeError(
            "Firebase Admin requires credentials. Set either "
            "GOOGLE_SERVICE_ACCOUNT_JSON (inline JSON) or "
            "GOOGLE_SERVICE_ACCOUNT_FILE (path to service account JSON file)."
        )

    info = json.loads(service_account_json)
    cred = credentials.Certificate(info)

    options: Dict[str, Any] = {}

    database_url = os.getenv("FIREBASE_DATABASE_URL")
    if database_url:
        options["databaseURL"] = database_url

    project_id = info.get("project_id") or os.getenv("FIREBASE_PROJECT_ID")
    if project_id:
        options["projectId"] = project_id

    _firebase_app = firebase_admin.initialize_app(cred, options or None)
    return _firebase_app


def verify_id_token(id_token: str) -> dict:
    """
    Verify a Firebase ID token and return the decoded payload.
    Custom claims (including 'role') will be present on the top level.
    """
    initialize_firebase_app()
    return auth.verify_id_token(id_token)


def get_firestore_client():
    """
    Get a Firestore client using the initialized Firebase Admin app.
    """
    initialize_firebase_app()
    return firestore.client()


def send_fcm_notification(
    token: str,
    title: str,
    body: str,
    data: dict[str, str] | None = None,
) -> str:
    """
    Send a single-device FCM notification.
    """
    initialize_firebase_app()

    notification = messaging.Notification(title=title, body=body)
    message = messaging.Message(
        token=token,
        notification=notification,
        data={k: str(v) for k, v in (data or {}).items()},
    )
    return messaging.send(message)


def get_user_role(uid: str) -> str | None:
    """
    Get the user's role from Firebase custom claims.
    Returns the role string (e.g., 'admin', 'staff') or None if not set.
    """
    initialize_firebase_app()
    try:
        user = auth.get_user(uid)
        return user.custom_claims.get("role") if user.custom_claims else None
    except auth.UserNotFoundError:
        return None
