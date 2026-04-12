from __future__ import annotations

from flask import Blueprint, jsonify, request
from firebase_admin import firestore

from services.firebase_admin import initialize_firebase_app, verify_id_token, get_user_role

events_bp = Blueprint("events", __name__, url_prefix="/api/events")

# Ensure Firebase Admin is initialized
initialize_firebase_app()
db = firestore.client()


def _extract_bearer_token() -> str:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise ValueError("Missing or invalid Authorization header")
    return auth_header.split(" ", 1)[1].strip()


def _get_current_user() -> dict:
    """Verify token and return user info including role."""
    id_token = _extract_bearer_token()
    return verify_id_token(id_token)


@events_bp.route("/<event_id>/join", methods=["POST"])
def request_join_event(event_id: str):
    """
    POST /api/events/{event_id}/join
    
    Request to join an open enrollment event.
    
    Body JSON:
      {
        "uid": "user_id",
        "displayName": "User Name",
        "photoURL": "https://..."
      }
    
    Authorization: Requires Firebase ID token
    """
    try:
        user = _get_current_user()
        uid = user.get("uid")
        
        data = request.get_json(silent=True) or {}
        display_name = data.get("displayName", "")
        photo_url = data.get("photoURL", "")
        
        # Get the event
        event_ref = db.collection("events").document(event_id)
        event_doc = event_ref.get()
        
        if not event_doc.exists:
            return jsonify({"error": "Event not found"}), 404
        
        event_data = event_doc.to_dict()
        
        # Check if enrollment is open
        enrollment_type = event_data.get("enrollmentType", "assigned")
        if enrollment_type not in ["open", "both"]:
            return jsonify({"error": "This event does not allow open enrollment"}), 403
        
        # Check capacity
        capacity = event_data.get("capacity")
        attendees = event_data.get("attendees", [])
        if capacity and len(attendees) >= capacity:
            return jsonify({"error": "Event is at full capacity"}), 403
        
        # Check if already a member
        if any(a.get("uid") == uid for a in attendees):
            return jsonify({"error": "Already a member of this event"}), 400
        
        # Check if already has a pending request
        join_requests = event_data.get("joinRequests", [])
        if any(r.get("uid") == uid and r.get("status") == "pending" for r in join_requests):
            return jsonify({"error": "Already have a pending request"}), 400
        
        # Add join request
        join_request = {
            "uid": uid,
            "displayName": display_name,
            "photoURL": photo_url,
            "requestedAt": firestore.SERVER_TIMESTAMP,
            "status": "pending"
        }
        
        event_ref.update({
            "joinRequests": firestore.ArrayUnion([join_request])
        })
        
        return jsonify({"message": "Join request submitted successfully"}), 200
        
    except ValueError as exc:
        return jsonify({"error": "Unauthorized", "details": str(exc)}), 401
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@events_bp.route("/<event_id>/join/<request_uid>/approve", methods=["POST"])
def approve_join_request(event_id: str, request_uid: str):
    """
    POST /api/events/{event_id}/join/{request_uid}/approve
    
    Approve a join request and add user to attendees.
    
    Authorization: Requires admin or staff role
    """
    try:
        user = _get_current_user()
        uid = user.get("uid")
        
        # Check role - only admin and staff can approve
        role = get_user_role(uid)
        if role not in ["admin", "staff"]:
            return jsonify({"error": "Only admins and staff can approve join requests"}), 403
        
        # Get the event
        event_ref = db.collection("events").document(event_id)
        event_doc = event_ref.get()
        
        if not event_doc.exists:
            return jsonify({"error": "Event not found"}), 404
        
        event_data = event_doc.to_dict()
        
        # Find the join request
        join_requests = event_data.get("joinRequests", [])
        request_to_approve = None
        updated_requests = []
        
        for req in join_requests:
            if req.get("uid") == request_uid:
                if req.get("status") != "pending":
                    return jsonify({"error": "Request is not pending"}), 400
                request_to_approve = req.copy()
                request_to_approve["status"] = "approved"
                request_to_approve["reviewedBy"] = uid
                request_to_approve["reviewedAt"] = firestore.SERVER_TIMESTAMP
            updated_requests.append(req)
        
        if not request_to_approve:
            return jsonify({"error": "Join request not found"}), 404
        
        # Check capacity
        capacity = event_data.get("capacity")
        attendees = event_data.get("attendees", [])
        if capacity and len(attendees) >= capacity:
            return jsonify({"error": "Event is at full capacity"}), 403
        
        # Add to attendees
        new_attendee = {
            "uid": request_uid,
            "displayName": request_to_approve.get("displayName", ""),
            "photoURL": request_to_approve.get("photoURL", ""),
            "joinedAt": firestore.SERVER_TIMESTAMP,
            "joinType": "enrolled"
        }
        
        # Update event
        event_ref.update({
            "joinRequests": updated_requests,
            "attendees": firestore.ArrayUnion([new_attendee])
        })
        
        return jsonify({"message": "Join request approved"}), 200
        
    except ValueError as exc:
        return jsonify({"error": "Unauthorized", "details": str(exc)}), 401
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@events_bp.route("/<event_id>/join/<request_uid>/reject", methods=["POST"])
def reject_join_request(event_id: str, request_uid: str):
    """
    POST /api/events/{event_id}/join/{request_uid}/reject
    
    Reject a join request.
    
    Body JSON (optional):
      {
        "note": "Reason for rejection"
      }
    
    Authorization: Requires admin or staff role
    """
    try:
        user = _get_current_user()
        uid = user.get("uid")
        
        # Check role - only admin and staff can reject
        role = get_user_role(uid)
        if role not in ["admin", "staff"]:
            return jsonify({"error": "Only admins and staff can reject join requests"}), 403
        
        data = request.get_json(silent=True) or {}
        note = data.get("note", "")
        
        # Get the event
        event_ref = db.collection("events").document(event_id)
        event_doc = event_ref.get()
        
        if not event_doc.exists:
            return jsonify({"error": "Event not found"}), 404
        
        event_data = event_doc.to_dict()
        
        # Find and update the join request
        join_requests = event_data.get("joinRequests", [])
        updated_requests = []
        request_found = False
        
        for req in join_requests:
            if req.get("uid") == request_uid:
                if req.get("status") != "pending":
                    return jsonify({"error": "Request is not pending"}), 400
                req["status"] = "rejected"
                req["reviewedBy"] = uid
                req["reviewedAt"] = firestore.SERVER_TIMESTAMP
                if note:
                    req["note"] = note
                request_found = True
            updated_requests.append(req)
        
        if not request_found:
            return jsonify({"error": "Join request not found"}), 404
        
        # Update event
        event_ref.update({
            "joinRequests": updated_requests
        })
        
        return jsonify({"message": "Join request rejected"}), 200
        
    except ValueError as exc:
        return jsonify({"error": "Unauthorized", "details": str(exc)}), 401
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@events_bp.route("/<event_id>/attendees/<attendee_uid>/remove", methods=["DELETE"])
def remove_attendee(event_id: str, attendee_uid: str):
    """
    DELETE /api/events/{event_id}/attendees/{attendee_uid}
    
    Remove an attendee from an event.
    
    Authorization: Requires admin or staff role
    """
    try:
        user = _get_current_user()
        uid = user.get("uid")
        
        # Check role - only admin and staff can remove
        role = get_user_role(uid)
        if role not in ["admin", "staff"]:
            return jsonify({"error": "Only admins and staff can remove attendees"}), 403
        
        # Get the event
        event_ref = db.collection("events").document(event_id)
        event_doc = event_ref.get()
        
        if not event_doc.exists:
            return jsonify({"error": "Event not found"}), 404
        
        event_data = event_doc.to_dict()
        
        # Find and remove the attendee
        attendees = event_data.get("attendees", [])
        updated_attendees = [a for a in attendees if a.get("uid") != attendee_uid]
        
        if len(updated_attendees) == len(attendees):
            return jsonify({"error": "Attendee not found"}), 404
        
        # Update event
        event_ref.update({
            "attendees": updated_attendees
        })
        
        return jsonify({"message": "Attendee removed"}), 200
        
    except ValueError as exc:
        return jsonify({"error": "Unauthorized", "details": str(exc)}), 401
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
