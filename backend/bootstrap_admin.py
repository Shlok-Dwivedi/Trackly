"""
Bootstrap script to set the first admin user.

This script bypasses the normal admin check to set the first admin.
Run this ONCE to bootstrap your first admin account.

Usage (from project root or backend folder):
    python backend/bootstrap_admin.py <firebase_user_uid> <role>

Example:
    python backend/bootstrap_admin.py cFdfbBXjeqWLZLEJX9FvjWR0p4E2 admin
"""
from __future__ import annotations

import sys
from pathlib import Path

from dotenv import load_dotenv

# Load .env from backend folder (works regardless of cwd)
_backend_dir = Path(__file__).resolve().parent
load_dotenv(_backend_dir / ".env")

from services.firebase_admin import get_firestore_client, initialize_firebase_app

# Initialize Firebase Admin
initialize_firebase_app()

from firebase_admin import auth as firebase_auth

ALLOWED_ROLES = {"admin", "staff", "volunteer", "viewer"}


def bootstrap_role(uid: str, role: str) -> None:
    """
    Set role for a user (both custom claim and Firestore).
    This bypasses admin check - use only for first admin setup.
    """
    role = role.lower()

    if role not in ALLOWED_ROLES:
        print(f"❌ Invalid role: {role}")
        print(f"   Allowed roles: {', '.join(ALLOWED_ROLES)}")
        sys.exit(1)

    try:
        # Verify user exists
        user = firebase_auth.get_user(uid)
        print(f"✓ Found user: {user.email} ({user.display_name or 'No name'})")

        # Set custom claim (security source of truth)
        firebase_auth.set_custom_user_claims(uid, {"role": role})
        print(f"✓ Set custom claim: role = {role}")

        # Update Firestore role field (display copy)
        db = get_firestore_client()
        db.collection("users").document(uid).update({"role": role})
        print(f"✓ Updated Firestore: role = {role}")

        print(f"\n✅ Success! User {user.email} is now {role}.")
        print("   User should refresh their browser to get the new token.")

    except firebase_auth.UserNotFoundError:
        print(f"❌ User not found: {uid}")
        print("   Make sure the user has logged in at least once.")
        sys.exit(1)
    except Exception as exc:
        print(f"❌ Error: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)

    uid = sys.argv[1]
    role = sys.argv[2]

    print(f"Setting role '{role}' for user {uid}...\n")
    bootstrap_role(uid, role)
