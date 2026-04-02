from __future__ import annotations

from flask import Blueprint, jsonify, request
from firebase_admin import auth as firebase_auth

from services.firebase_admin import (
    get_firestore_client,
    initialize_firebase_app,
    verify_id_token,
)


auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

# Ensure Firebase Admin is initialized when this module is imported.
initialize_firebase_app()

ALLOWED_ROLES = {"admin", "staff", "volunteer", "viewer"}


def _extract_bearer_token() -> str:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise ValueError("Missing or invalid Authorization header")
    return auth_header.split(" ", 1)[1].strip()


@auth_bp.route("/set-role", methods=["POST"])
def set_role():
    """
    POST /api/auth/set-role

    Body JSON:
      {
        "uid": "<firebase user id>",
        "role": "admin" | "staff" | "volunteer | "viewer"
      }

    Authorization:
      - Requires a Firebase ID token in the Authorization header.
      - Only users with custom claim role == "admin" are allowed.
    """
    data = request.get_json(silent=True) or {}
    uid = data.get("uid")
    role = (data.get("role") or "").lower()

    if not uid or not role:
        return jsonify({"error": "uid and role are required"}), 400

    if role not in ALLOWED_ROLES:
        return jsonify({"error": "Invalid role"}), 400

    # Authorize the caller as an admin based on their Firebase ID token.
    try:
        id_token = _extract_bearer_token()
        decoded = verify_id_token(id_token)
        caller_uid = decoded.get("uid") or decoded.get("user_id")
        caller_role = decoded.get("role")

        # Fallback: check Firestore if custom claim not set yet
        if not caller_role and caller_uid:
            db = get_firestore_client()
            doc = db.collection("users").document(caller_uid).get()
            if doc.exists:
                caller_role = (doc.to_dict() or {}).get("role")

        if caller_role != "admin":
            return jsonify({"error": "Forbidden: admin role required"}), 403
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": "Unauthorized", "details": str(exc)}), 401

    try:
        # Set custom claim (security source of truth)
        firebase_auth.set_custom_user_claims(uid, {"role": role})
        
        # Also update Firestore role field (display-only copy for easy querying)
        # This keeps Firestore in sync for the Users page display
        db = get_firestore_client()
        db.collection("users").document(uid).update({"role": role})
        
        return jsonify({"uid": uid, "role": role, "status": "updated"}), 200
    except Exception as exc:  # noqa: BLE001
        return jsonify(
            {
                "error": "Failed to set role",
                "details": str(exc),
            }
        ), 500


@auth_bp.route("/delete-user", methods=["POST"])
def delete_user():
    """
    POST /api/auth/delete-user
    Body: { "uid": "<firebase uid>" }
    Requires admin Authorization header.
    Deletes the Firebase Auth account so the user can re-register.
    """
    data = request.get_json(silent=True) or {}
    uid = data.get("uid")
    if not uid:
        return jsonify({"error": "uid is required"}), 400

    try:
        id_token = _extract_bearer_token()
        decoded = verify_id_token(id_token)
        caller_uid = decoded.get("uid") or decoded.get("user_id")
        caller_role = decoded.get("role")
        if not caller_role and caller_uid:
            db = get_firestore_client()
            d = db.collection("users").document(caller_uid).get()
            if d.exists:
                caller_role = (d.to_dict() or {}).get("role")
        if caller_role != "admin":
            return jsonify({"error": "Forbidden: admin role required"}), 403
    except Exception as exc:
        return jsonify({"error": "Unauthorized", "details": str(exc)}), 401

    try:
        firebase_auth.delete_user(uid)
        return jsonify({"uid": uid, "status": "deleted"}), 200
    except Exception as exc:
        return jsonify({"error": "Failed to delete user", "details": str(exc)}), 500
