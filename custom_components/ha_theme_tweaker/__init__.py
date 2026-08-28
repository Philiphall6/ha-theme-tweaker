"""HA Theme Tweaker integration."""

from __future__ import annotations

from pathlib import Path

from homeassistant.components import panel_custom
from homeassistant.components.frontend import (
    add_extra_js_url,
    async_panel_exists,
    async_remove_panel,
    remove_extra_js_url,
)
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType

from .const import (
    DOMAIN,
    PANEL_ELEMENT,
    PANEL_ICON,
    PANEL_TITLE,
    PANEL_URL,
    STATIC_URL,
    VERSION,
)
from .websocket import async_register_websocket_commands

GLOBAL_MODULE_URL = f"{STATIC_URL}/ha-theme-tweaker.js?v={VERSION}"
PANEL_MODULE_URL = f"{STATIC_URL}/panel.js?v={VERSION}"


async def _async_register_frontend_assets(hass: HomeAssistant) -> None:
    """Serve frontend assets and load the global style injector."""
    data = hass.data.setdefault(DOMAIN, {})
    if not data.get("static_registered"):
        frontend_path = Path(__file__).parent / "frontend"
        await hass.http.async_register_static_paths(
            [StaticPathConfig(STATIC_URL, str(frontend_path), False)]
        )
        data["static_registered"] = True

    if not data.get("extra_js_registered"):
        add_extra_js_url(hass, GLOBAL_MODULE_URL)
        data["extra_js_registered"] = True


async def _async_register_panel(hass: HomeAssistant) -> None:
    """Register the Theme Tweaker sidebar panel."""
    if async_panel_exists(hass, PANEL_URL):
        async_remove_panel(hass, PANEL_URL, warn_if_unknown=False)

    await panel_custom.async_register_panel(
        hass=hass,
        frontend_url_path=PANEL_URL,
        webcomponent_name=PANEL_ELEMENT,
        module_url=PANEL_MODULE_URL,
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        require_admin=True,
        config_panel_domain=DOMAIN,
        config={"version": VERSION},
    )


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up HA Theme Tweaker."""
    hass.data.setdefault(DOMAIN, {})
    await _async_register_frontend_assets(hass)
    async_register_websocket_commands(hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up HA Theme Tweaker from a config entry."""
    await _async_register_frontend_assets(hass)
    await _async_register_panel(hass)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload HA Theme Tweaker."""
    async_remove_panel(hass, PANEL_URL, warn_if_unknown=False)
    data = hass.data.setdefault(DOMAIN, {})
    if data.get("extra_js_registered"):
        remove_extra_js_url(hass, GLOBAL_MODULE_URL)
        data["extra_js_registered"] = False
    return True
