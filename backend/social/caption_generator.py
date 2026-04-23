"""
AI caption generator for social media posts.

Uses the Anthropic API (claude-haiku) to generate warm, professional
Spanish-language captions for Libélula Podología y Terapias.

If ANTHROPIC_API_KEY is not set, returns a simple fallback caption so the
rest of the publish flow still works without AI.
"""
import httpx

from config import settings

_SYSTEM = (
    "Eres el asistente de redes sociales de Libélula Podología y Terapias, "
    "una clínica de podología y terapias holísticas en Santiago, Chile. "
    "Genera captions creativos, cálidos y profesionales para Instagram y Facebook. "
    "Tono: cercano, femenino, empático, bienestar y confianza. "
    "Usa español chileno neutro (tuteo, sin voseo). "
    "Máximo 4 oraciones. Sin hashtags (se agregan después). Máximo 2 emojis."
)


def generate_caption(
    titulo: str,
    descripcion: str | None = None,
    tono: str | None = None,
    contexto_extra: str | None = None,
) -> str:
    """
    Call the Anthropic API to generate a caption.
    Falls back to a simple title + description if no key is configured.
    """
    api_key = settings.ANTHROPIC_API_KEY
    if not api_key:
        return _fallback(titulo, descripcion)

    parts = [f"Título del post: {titulo}"]
    if descripcion:
        parts.append(f"Descripción: {descripcion}")
    if tono:
        parts.append(f"Tono deseado: {tono}")
    if contexto_extra:
        parts.append(f"Contexto adicional: {contexto_extra}")

    try:
        resp = httpx.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 300,
                "system": _SYSTEM,
                "messages": [{"role": "user", "content": "\n".join(parts)}],
            },
            timeout=25,
        )
        resp.raise_for_status()
        return resp.json()["content"][0]["text"].strip()
    except Exception:  # noqa: BLE001
        return _fallback(titulo, descripcion)


def _fallback(titulo: str, descripcion: str | None) -> str:
    lines = [titulo]
    if descripcion:
        lines.append(descripcion)
    return "\n\n".join(lines)
