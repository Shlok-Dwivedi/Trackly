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

