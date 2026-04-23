"""
WhatsApp bot engine.

Reads config/whatsapp_responses.json at import time (and refreshes on each
call so you can edit the JSON without restarting the server).

Intent matching:
  1. Tokenise the user message (lower-case words).
  2. For every intent, count how many keywords are present.
  3. Pick the intent with the highest weighted match score.
     Tie-breaks resolved by 'priority' field (higher wins).
  4. If no intent matches, return the default_response.
"""
import re
from functools import lru_cache

from config import settings


def _normalise(text: str) -> str:
    """Lower-case, strip accents approximation, remove punctuation."""
    text = text.lower()
    # simple accent strip (good enough for Spanish keyword matching)
    for src, dst in [("á","a"),("é","e"),("í","i"),("ó","o"),("ú","u"),("ü","u"),("ñ","n")]:
        text = text.replace(src, dst)
    return re.sub(r"[^\w\s]", " ", text)


def match_intent(user_message: str) -> str:
    """Return the best-matching response string for the given user message."""
    cfg = settings.whatsapp_responses          # re-read JSON each call
    intents: list[dict] = cfg.get("intents", [])
    default: str = cfg.get("default_response", "Gracias por tu mensaje.")

    norm_msg = _normalise(user_message)
    words    = set(norm_msg.split())

    best_score    = 0
    best_priority = -1
    best_response = default

    for intent in intents:
        keywords: list[str] = intent.get("keywords", [])
        priority: int       = intent.get("priority", 1)
        response: str       = intent.get("response", default)

        score = sum(
            1
            for kw in keywords
            if _normalise(kw) in norm_msg          # substring match
        )

        if score > best_score or (score == best_score and priority > best_priority and score > 0):
            best_score    = score
            best_priority = priority
            best_response = response

    return best_response
