"""Persistent settings storage for HA Theme Tweaker."""

from __future__ import annotations

import re
from typing import Any, cast

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import (
    DEFAULT_SETTINGS,
    DOMAIN,
    SETTING_KEYS,
    STORAGE_KEY,
    STORAGE_MINOR_VERSION,
    STORAGE_VERSION,
)

MAX_VALUE_LENGTH = 180
_FORBIDDEN_CSS = re.compile(r"[{};<>]")


def _normalize_value(key: str, value: Any) -> str | None:
    """Normalize one stored CSS setting."""
    if key not in SETTING_KEYS:
        raise ValueError(f"Unknown setting: {key}")

    if value is None:
        return None

    if not isinstance(value, str):
        raise ValueError(f"Setting {key} must be a string or null")

    normalized = value.strip()
    if normalized == "":
        return None

    if len(normalized) > MAX_VALUE_LENGTH:
        raise ValueError(f"Setting {key} is too long")

    if _FORBIDDEN_CSS.search(normalized):
        raise ValueError(f"Setting {key} contains unsupported CSS characters")

    return normalized


def normalize_settings(settings: dict[str, Any] | None) -> dict[str, str | None]:
    """Return a complete settings dictionary with unknown keys removed."""
    normalized: dict[str, str | None] = dict(DEFAULT_SETTINGS)
    if not settings:
        return normalized

    for key, value in settings.items():
        if key in SETTING_KEYS:
            normalized[key] = _normalize_value(key, value)

    return normalized


def normalize_patch(settings: dict[str, Any]) -> dict[str, str | None]:
    """Validate and normalize a partial settings update."""
    if not isinstance(settings, dict):
        raise ValueError("settings must be an object")

    return {key: _normalize_value(key, value) for key, value in settings.items()}


class ThemeTweakerStorage:
    """Wrapper around Home Assistant's .storage helper."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize the storage wrapper."""
        self._store: Store[dict[str, Any]] = Store(
            hass,
            STORAGE_VERSION,
            STORAGE_KEY,
            minor_version=STORAGE_MINOR_VERSION,
        )
        self._settings: dict[str, str | None] | None = None

    async def async_get(self) -> dict[str, str | None]:
        """Load settings from .storage and cache them."""
        if self._settings is None:
            data = await self._store.async_load()
            raw_settings: dict[str, Any] | None
            if isinstance(data, dict) and isinstance(data.get("settings"), dict):
                raw_settings = cast(dict[str, Any], data["settings"])
            elif isinstance(data, dict):
                raw_settings = data
            else:
                raw_settings = None
            self._settings = normalize_settings(raw_settings)

        return dict(self._settings)

    async def async_save(self, settings: dict[str, Any]) -> dict[str, str | None]:
        """Replace all settings and persist them."""
        normalized = normalize_settings(settings)
        self._settings = normalized
        await self._store.async_save({"settings": normalized})
        return dict(normalized)

    async def async_update(self, patch: dict[str, Any]) -> dict[str, str | None]:
        """Apply a partial update and persist it."""
        current = await self.async_get()
        current.update(normalize_patch(patch))
        self._settings = current
        await self._store.async_save({"settings": current})
        return dict(current)

    async def async_reset_setting(self, key: str) -> dict[str, str | None]:
        """Reset one setting to inherit from the active theme."""
        if key not in SETTING_KEYS:
            raise ValueError(f"Unknown setting: {key}")

        current = await self.async_get()
        current[key] = None
        self._settings = current
        await self._store.async_save({"settings": current})
        return dict(current)

    async def async_reset_all(self) -> dict[str, str | None]:
        """Reset every override."""
        self._settings = dict(DEFAULT_SETTINGS)
        await self._store.async_save({"settings": self._settings})
        return dict(self._settings)


def async_get_storage(hass: HomeAssistant) -> ThemeTweakerStorage:
    """Return the singleton storage wrapper."""
    data = hass.data.setdefault(DOMAIN, {})
    if "storage" not in data:
        data["storage"] = ThemeTweakerStorage(hass)
    return cast(ThemeTweakerStorage, data["storage"])
