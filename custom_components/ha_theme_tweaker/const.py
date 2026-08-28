"""Constants for HA Theme Tweaker."""

from __future__ import annotations

DOMAIN = "ha_theme_tweaker"
NAME = "HA Theme Tweaker"
VERSION = "1.0.0"

PANEL_URL = "ha-theme-tweaker"
PANEL_ELEMENT = "ha-theme-tweaker-panel"
PANEL_TITLE = "Theme Tweaker"
PANEL_ICON = "mdi:palette-swatch"

STATIC_URL = f"/{DOMAIN}_static"

STORAGE_KEY = DOMAIN
STORAGE_VERSION = 1
STORAGE_MINOR_VERSION = 1

SIGNAL_SETTINGS_UPDATED = f"{DOMAIN}_settings_updated"
EVENT_SETTINGS_UPDATED = f"{DOMAIN}_settings_updated"

DEFAULT_SETTINGS: dict[str, str | None] = {
    "sidebar_background": None,
    "sidebar_icon_color": None,
    "sidebar_text_color": None,
    "sidebar_selected_color": None,
    "sidebar_hover_color": None,
    "sidebar_badge_background": None,
    "sidebar_badge_text": None,
    "sidebar_badge_border_color": None,
    "sidebar_badge_radius": None,
    "sidebar_badge_font_size": None,
    "sidebar_badge_font_weight": None,
    "sidebar_badge_min_width": None,
    "sidebar_badge_height": None,
    "primary_color": None,
    "accent_color": None,
    "text_accent_color": None,
    "primary_background_color": None,
    "secondary_background_color": None,
    "card_background_color": None,
    "primary_text_color": None,
    "secondary_text_color": None,
    "disabled_text_color": None,
    "divider_color": None,
    "card_background": None,
    "card_border": None,
    "card_radius": None,
    "card_shadow": None,
    "card_text_color": None,
    "card_icon_color": None,
    "mushroom_card_radius": None,
    "mushroom_shape_color": None,
    "mushroom_icon_color": None,
    "mushroom_primary_text_color": None,
    "mushroom_secondary_text_color": None,
    "header_background": None,
    "header_text_color": None,
    "header_icon_color": None,
    "header_accent_color": None,
}

SETTING_KEYS = frozenset(DEFAULT_SETTINGS)
