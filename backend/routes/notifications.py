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
      - 24 hours before start
      - 6 hours before start
      - 3 hours before start

    Call this endpoint every hour via a cron job (e.g. cron-job.org, Render Cron).
    It is idempotent — uses a 'reminders_sent' set on each event to avoid duplicates.

    No body required. Returns counts of notifications sent.
    """
    import time

    db = get_firestore_client()
    now_ms = int(time.time() * 1000)

    # Windows: label -> (min_ms_ahead, max_ms_ahead)
    WINDOWS = {
        "24h": (23 * 3600 * 1000, 25 * 3600 * 1000),
        "6h":  ( 5 * 3600 * 1000,  7 * 3600 * 1000),
        "3h":  ( 2 * 3600 * 1000,  4 * 3600 * 1000),
    }

    LABELS = {
        "24h": "24 hours",
        "6h":  "6 hours",
        "3h":  "3 hours",
    }

    sent_count = 0
    errors = []

    try:
        # Only fetch planned/ongoing events in the future
        events_ref = db.collection("events")
        events = events_ref.where("status", "in", ["Planned", "planned", "Ongoing", "ongoing"]).stream()

        for event_doc in events:
            event = event_doc.to_dict() or {}
            event_id = event_doc.id
            start_ms = event.get("startDate")
            if not start_ms or not isinstance(start_ms, (int, float)):
                continue

            title = event.get("title", "an event")
            assigned_to = event.get("assignedTo") or []
            reminders_sent = set(event.get("reminders_sent") or [])

            for label, (min_ahead, max_ahead) in WINDOWS.items():
                reminder_key = f"{label}"
                if reminder_key in reminders_sent:
                    continue  # already sent

                time_until = start_ms - now_ms
                if min_ahead <= time_until <= max_ahead:
                    # Send Firestore notification to each assigned user
                    for uid in assigned_to:
                        try:
                            db.collection("notifications").add({
                                "userId": uid,
                                "title": f"Reminder: {title}",
                                "body": f"Your event starts in {LABELS[label]}.",
                                "eventId": event_id,
                                "read": False,
                                "createdAt": int(time.time() * 1000),
                                "type": "reminder",
                            })
                            sent_count += 1
                        except Exception as e:
                            errors.append(str(e))

                    # Mark reminder as sent on the event
                    reminders_sent.add(reminder_key)
                    try:
                        event_doc.reference.update({"reminders_sent": list(reminders_sent)})
                    except Exception as e:
                        errors.append(f"mark_sent: {e}")

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({"sent": sent_count, "errors": errors}), 200
