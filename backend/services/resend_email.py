from __future__ import annotations

import os
from typing import Any, Dict

import requests


RESEND_BASE_URL = "https://api.resend.com"


def send_email(
    to: str,
    subject: str,
    html: str,
    text: str | None = None,
) -> Dict[str, Any]:
    """
    Send an email using the Resend API.
    """
    api_key = os.getenv("RESEND_API_KEY")
    from_email = os.getenv("RESEND_FROM_EMAIL")

    if not api_key or not from_email:
        raise RuntimeError(
            "RESEND_API_KEY and RESEND_FROM_EMAIL environment variables are required "
            "to send email via Resend."
        )

    payload: Dict[str, Any] = {
        "from": from_email,
        "to": [to],
        "subject": subject,
        "html": html,
    }
    if text:
        payload["text"] = text

    response = requests.post(
        f"{RESEND_BASE_URL}/emails",
        json=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        timeout=10,
    )
    response.raise_for_status()
    return response.json()

