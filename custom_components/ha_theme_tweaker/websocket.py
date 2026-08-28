"""WebSocket API for HA Theme Tweaker."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect, async_dispatcher_send

from .const import (
    DOMAIN,
    EVENT_SETTINGS_UPDATED,
    SIGNAL_SETTINGS_UPDATED,
)
from .storage import async_get_storage

WS_GET_SETTINGS = f"{DOMAIN}/get_settings"
WS_SAVE_SETTINGS = f"{DOMAIN}/save_settings"
WS_RESET_SETTING = f"{DOMAIN}/reset_setting"
WS_RESET_ALL = f"{DOMAIN}/reset_all"
WS_SUBSCRIBE = f"{DOMAIN}/subscribe_updates"


def _send_settings_update(hass: HomeAssistant, settings: dict[str, str | None]) -> None:
    """Notify connected frontends that settings changed."""
    async_dispatcher_send(hass, SIGNAL_SETTINGS_UPDATED, settings)
    hass.bus.async_fire(EVENT_SETTINGS_UPDATED, {"settings": settings})


def async_register_websocket_commands(hass: HomeAssistant) -> None:
    """Register WebSocket commands."""
    websocket_api.async_register_command(hass, websocket_get_settings)
    websocket_api.async_register_command(hass, websocket_save_settings)
    websocket_api.async_register_command(hass, websocket_reset_setting)
    websocket_api.async_register_command(hass, websocket_reset_all)
    websocket_api.async_register_command(hass, websocket_subscribe_updates)


@websocket_api.websocket_command({vol.Required("type"): WS_GET_SETTINGS})
@websocket_api.async_response
async def websocket_get_settings(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return all stored overrides."""
    settings = await async_get_storage(hass).async_get()
    connection.send_result(msg["id"], {"settings": settings})


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_SAVE_SETTINGS,
        vol.Required("settings"): dict,
    }
)
@websocket_api.async_response
async def websocket_save_settings(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Persist a partial set of overrides."""
    try:
        settings = await async_get_storage(hass).async_update(msg["settings"])
    except ValueError as err:
        connection.send_error(msg["id"], websocket_api.ERR_INVALID_FORMAT, str(err))
        return

    _send_settings_update(hass, settings)
    connection.send_result(msg["id"], {"settings": settings})


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_RESET_SETTING,
        vol.Required("key"): str,
    }
)
@websocket_api.async_response
async def websocket_reset_setting(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Reset one override to null."""
    try:
        settings = await async_get_storage(hass).async_reset_setting(msg["key"])
    except ValueError as err:
        connection.send_error(msg["id"], websocket_api.ERR_INVALID_FORMAT, str(err))
        return

    _send_settings_update(hass, settings)
    connection.send_result(msg["id"], {"settings": settings})


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): WS_RESET_ALL})
@websocket_api.async_response
async def websocket_reset_all(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Reset all overrides to null."""
    settings = await async_get_storage(hass).async_reset_all()
    _send_settings_update(hass, settings)
    connection.send_result(msg["id"], {"settings": settings})


@callback
@websocket_api.websocket_command({vol.Required("type"): WS_SUBSCRIBE})
def websocket_subscribe_updates(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Subscribe to HA Theme Tweaker updates."""

    @callback
    def _forward_update(settings: dict[str, str | None]) -> None:
        connection.send_message(
            websocket_api.event_message(msg["id"], {"settings": settings})
        )

    connection.subscriptions[msg["id"]] = async_dispatcher_connect(
        hass, SIGNAL_SETTINGS_UPDATED, _forward_update
    )
    connection.send_result(msg["id"])
