from __future__ import annotations

from flask import Blueprint, jsonify, request

from services.firebase_admin import (
    get_firestore_client,
    initialize_firebase_app,
    send_fcm_notification,
)
from services.resend_email import send_email


notifications_bp = Blueprint("notifications", __name__, url_prefix="/api/notifications")

# Ensure Firebase Admin is initialized.
initialize_firebase_app()


@notifications_bp.route("/send", methods=["POST"])
def send_notifications():
    """
    POST /api/notifications/send

    Sends email via Resend and FCM push via Firebase Admin SDK.

    Body JSON (flexible contract to keep backend minimal):
      {
        "userId": "<firebase uid>",         # optional, used to look up fcmToken in /users
        "email": "user@example.com",       # optional, email recipient
        "subject": "Notification subject", # required
        "message": "Body text or HTML",    # required
        "eventId": "<event id>",           # optional, passed as data in push
        "sendEmail": true,                 # default true if email provided
        "sendPush": true                   # default true if userId provided
      }
    """
    data = request.get_json(silent=True) or {}

    user_id = data.get("userId")
    email = data.get("email")
    subject = data.get("subject")
    message = data.get("message")
    event_id = data.get("eventId")
    send_email_flag = data.get("sendEmail", True)
    send_push_flag = data.get("sendPush", True)

    if not subject or not message:
        return jsonify({"error": "subject and message are required"}), 400

    if not user_id and not email:
        return jsonify({"error": "At least one of userId or email is required"}), 400

    results: dict[str, str] = {}

    # Email via Resend
    if send_email_flag and email:
        try:
            send_email(to=email, subject=subject, html=message)
            results["email"] = "sent"
        except Exception as exc:  # noqa: BLE001
            results["email"] = f"error: {exc}"

    # Push via FCM
    if send_push_flag and user_id:
        try:
            db = get_firestore_client()
            doc = db.collection("users").document(user_id).get()
            if not doc.exists:
                results["push"] = "user_not_found"
            else:
                user_data = doc.to_dict() or {}
                token = user_data.get("fcmToken")
                if not token:
                    results["push"] = "no_fcm_token"
                else:
                    data_payload = {"eventId": str(event_id)} if event_id else {}
                    send_fcm_notification(
                        token=token,
                        title=subject,
                        body=message,
                        data=data_payload,
                    )
                    results["push"] = "sent"
        except Exception as exc:  # noqa: BLE001
            results["push"] = f"error: {exc}"

    return jsonify({"results": results}), 200


@notifications_bp.route("/remind", methods=["POST"])
def send_event_reminders():
    """
    POST /api/notifications/remind

    Scans upcoming events and sends Firestore notifications at:
      - 24 hours before start  (if user has reminder24hr enabled)
      - 6 hours before start   (if user has reminder6hr enabled)
      - 3 hours before start   (if user has reminder3hr enabled)

    Windows are ±90 minutes wide so an hourly cron never misses a window.
    Idempotent — tracks sent reminders in event.reminders_sent[].
    """
    import time

    db = get_firestore_client()
    now_ms = int(time.time() * 1000)

    # (label, pref_key, center_ms, window_ms)
    WINDOWS = [
        ("24h", "reminder24hr", 24 * 3600 * 1000, 90 * 60 * 1000),
        ("6h",  "reminder6hr",   6 * 3600 * 1000, 90 * 60 * 1000),
        ("3h",  "reminder3hr",   3 * 3600 * 1000, 90 * 60 * 1000),
    ]

    LABELS = {"24h": "24 hours", "6h": "6 hours", "3h": "3 hours"}

    sent_count = 0
    errors = []

    # Cache user prefs to avoid repeated reads
    user_prefs_cache: dict = {}

    def get_user_prefs(uid: str) -> dict:
        if uid in user_prefs_cache:
            return user_prefs_cache[uid]
        try:
            doc = db.collection("users").document(uid).get()
            prefs = (doc.to_dict() or {}).get("notificationPrefs") or {}
        except Exception:
            prefs = {}
        user_prefs_cache[uid] = prefs
        return prefs

    try:
        events_stream = db.collection("events").stream()

        for event_doc in events_stream:
            event = event_doc.to_dict() or {}
            status = (event.get("status") or "").lower()
            if status not in ("planned", "ongoing"):
                continue

            start_ms = event.get("startDate")
            if not start_ms or not isinstance(start_ms, (int, float)):
                continue

            # Skip past events
            if start_ms < now_ms:
                continue

            title = event.get("title", "an event")
            event_id = event_doc.id
            assigned_to = event.get("assignedTo") or []
            reminders_sent = set(event.get("reminders_sent") or [])

            for label, pref_key, center_ms, window_ms in WINDOWS:
                if label in reminders_sent:
                    continue

                time_until = start_ms - now_ms
                if abs(time_until - center_ms) > window_ms:
                    continue

                # Send to each assigned user who has this pref enabled
                notified_anyone = False
                for uid in assigned_to:
                    prefs = get_user_prefs(uid)
                    # Default True if pref not set
                    if prefs.get(pref_key, True) is False:
                        continue
                    try:
                        db.collection("notifications").add({
                            "userId": uid,
                            "title": f"Reminder: {title}",
                            "body": f"Your event starts in {LABELS[label]}.",
                            "eventId": event_id,
                            "read": False,
                            "createdAt": now_ms,
                            "type": "reminder",
                        })
                        sent_count += 1
                        notified_anyone = True
                    except Exception as e:
                        errors.append(str(e))

                if notified_anyone:
                    reminders_sent.add(label)
                    try:
                        event_doc.reference.update({"reminders_sent": list(reminders_sent)})
                    except Exception as e:
                        errors.append(f"mark_sent:{e}")

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({"sent": sent_count, "errors": errors}), 200
