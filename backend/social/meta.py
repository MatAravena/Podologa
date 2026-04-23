"""
Meta Graph API — Facebook + Instagram auto-posting.

Reads config/social_accounts.json to find enabled accounts and the env-var
name that holds each account's long-lived access token.

Usage:
    from social.meta import publish_to_all_accounts
    results = publish_to_all_accounts(
        image_url="https://yourdomain.com/uploads/photo.jpg",
        caption="Texto del post #podología",
        media_type="image",  # "image" | "video"
    )
"""
import os
from typing import Literal

import httpx

from config import settings

GRAPH_BASE = "https://graph.facebook.com/v19.0"


# ── Per-platform helpers ──────────────────────────────────────────────────────

def _post_to_facebook(page_id: str, token: str, media_url: str, caption: str, media_type: str) -> dict:
    if media_type == "video":
        endpoint = f"{GRAPH_BASE}/{page_id}/videos"
        data = {"file_url": media_url, "description": caption, "access_token": token}
    else:
        endpoint = f"{GRAPH_BASE}/{page_id}/photos"
        data = {"url": media_url, "caption": caption, "access_token": token}

    resp = httpx.post(endpoint, data=data, timeout=30)
    resp.raise_for_status()
    return {"platform": "facebook", "account": page_id, **resp.json()}


def _post_to_instagram(ig_account_id: str, token: str, media_url: str, caption: str, media_type: str) -> dict:
    # Step 1: create media container
    container_endpoint = f"{GRAPH_BASE}/{ig_account_id}/media"
    if media_type == "video":
        container_data = {
            "media_type": "REELS",
            "video_url": media_url,
            "caption": caption,
            "access_token": token,
        }
    else:
        container_data = {
            "image_url": media_url,
            "caption": caption,
            "access_token": token,
        }
    r1 = httpx.post(container_endpoint, data=container_data, timeout=30)
    r1.raise_for_status()
    creation_id = r1.json()["id"]

    # Step 2: publish the container
    publish_endpoint = f"{GRAPH_BASE}/{ig_account_id}/media_publish"
    r2 = httpx.post(publish_endpoint, data={"creation_id": creation_id, "access_token": token}, timeout=30)
    r2.raise_for_status()
    return {"platform": "instagram", "account": ig_account_id, **r2.json()}


# ── Public interface ─────────────────────────────────────────────────────────

def publish_to_all_accounts(
    media_url: str,
    caption: str,
    media_type: Literal["image", "video"] = "image",
) -> list[dict]:
    """
    Post to every enabled account in config/social_accounts.json.
    Returns a list of result dicts (one per account).
    Errors are caught and returned as {"error": "..."} so one failure
    doesn't block other accounts.
    """
    cfg = settings.social_accounts
    accounts: list[dict] = cfg.get("accounts", [])
    defaults: dict = cfg.get("post_defaults", {})

    # Build the final caption
    full_caption = caption
    if defaults.get("append_hashtags"):
        full_caption += "\n\n" + defaults.get("hashtags", "")
    if defaults.get("append_booking_link"):
        full_caption += "\n" + defaults.get("booking_link", "")

    results: list[dict] = []

    for account in accounts:
        if not account.get("enabled", True):
            continue

        token_env_name = account.get("access_token_env", "")
        token = os.getenv(token_env_name) or getattr(settings, token_env_name, "")
        page_id = account.get("page_id", "")

        if not token or not page_id or page_id.startswith("${"):
            results.append({
                "platform": account.get("platform"),
                "account": account.get("id"),
                "error": "Credenciales no configuradas",
            })
            continue

        try:
            platform = account.get("platform")
            if platform == "facebook":
                result = _post_to_facebook(page_id, token, media_url, full_caption, media_type)
            elif platform == "instagram":
                result = _post_to_instagram(page_id, token, media_url, full_caption, media_type)
            else:
                result = {"error": f"Plataforma desconocida: {platform}"}
            results.append({**result, "account_id": account.get("id")})

        except httpx.HTTPStatusError as exc:
            results.append({
                "platform": account.get("platform"),
                "account": account.get("id"),
                "error": f"HTTP {exc.response.status_code}: {exc.response.text[:200]}",
            })
        except Exception as exc:  # noqa: BLE001
            results.append({
                "platform": account.get("platform"),
                "account": account.get("id"),
                "error": str(exc),
            })

    return results
