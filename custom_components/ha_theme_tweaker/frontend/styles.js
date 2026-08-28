export const DOMAIN = "ha_theme_tweaker";

export const WS_TYPES = {
  getSettings: `${DOMAIN}/get_settings`,
  saveSettings: `${DOMAIN}/save_settings`,
  resetSetting: `${DOMAIN}/reset_setting`,
  resetAll: `${DOMAIN}/reset_all`,
  subscribe: `${DOMAIN}/subscribe_updates`,
};

export const SETTING_GROUPS = [
  {
    id: "sidebar",
    title: "Sidebar / Menu",
    icon: "mdi:menu",
    settings: [
      {
        key: "sidebar_background",
        label: "Sidebar background",
        type: "color",
        placeholder: "#111827",
      },
      {
        key: "sidebar_icon_color",
        label: "Icons",
        type: "color",
        placeholder: "#9ca3af",
      },
      {
        key: "sidebar_text_color",
        label: "Text",
        type: "color",
        placeholder: "#e5e7eb",
      },
      {
        key: "sidebar_selected_color",
        label: "Selected item",
        type: "color",
        placeholder: "#03a9f4",
      },
      {
        key: "sidebar_hover_color",
        label: "Hover",
        type: "color",
        placeholder: "rgba(3, 169, 244, 0.16)",
      },
    ],
  },
  {
    id: "badges",
    title: "Badges",
    icon: "mdi:numeric-3-box-multiple-outline",
    settings: [
      {
        key: "sidebar_badge_background",
        label: "Background",
        type: "color",
        placeholder: "#ff3b30",
      },
      {
        key: "sidebar_badge_text",
        label: "Text",
        type: "color",
        placeholder: "#ffffff",
      },
      {
        key: "sidebar_badge_border_color",
        label: "Border",
        type: "color",
        placeholder: "#ff817a",
      },
      {
        key: "sidebar_badge_radius",
        label: "Radius",
        type: "length",
        placeholder: "999px",
      },
      {
        key: "sidebar_badge_font_size",
        label: "Font size",
        type: "length",
        placeholder: "11px",
      },
      {
        key: "sidebar_badge_font_weight",
        label: "Font weight",
        type: "fontWeight",
        placeholder: "600",
      },
      {
        key: "sidebar_badge_min_width",
        label: "Min. width",
        type: "length",
        placeholder: "18px",
      },
      {
        key: "sidebar_badge_height",
        label: "Height",
        type: "length",
        placeholder: "18px",
      },
    ],
  },
  {
    id: "general",
    title: "General Colors",
    icon: "mdi:palette",
    settings: [
      {
        key: "primary_color",
        label: "primary-color",
        type: "color",
        placeholder: "#03a9f4",
      },
      {
        key: "accent_color",
        label: "accent-color",
        type: "color",
        placeholder: "#ff9800",
      },
      {
        key: "primary_background_color",
        label: "primary-background-color",
        type: "color",
        placeholder: "#111827",
      },
      {
        key: "secondary_background_color",
        label: "secondary-background-color",
        type: "color",
        placeholder: "#1f2937",
      },
      {
        key: "card_background_color",
        label: "card-background-color",
        type: "color",
        placeholder: "#202634",
      },
      {
        key: "primary_text_color",
        label: "primary-text-color",
        type: "color",
        placeholder: "#f9fafb",
      },
      {
        key: "secondary_text_color",
        label: "secondary-text-color",
        type: "color",
        placeholder: "#cbd5e1",
      },
      {
        key: "disabled_text_color",
        label: "disabled-text-color",
        type: "color",
        placeholder: "#6b7280",
      },
      {
        key: "divider_color",
        label: "divider-color",
        type: "color",
        placeholder: "#374151",
      },
    ],
  },
  {
    id: "cards",
    title: "Cards",
    icon: "mdi:card-outline",
    settings: [
      {
        key: "card_background",
        label: "Background",
        type: "color",
        placeholder: "#202634",
      },
      {
        key: "card_border",
        label: "Border",
        type: "text",
        placeholder: "1px solid rgba(255,255,255,0.12)",
      },
      {
        key: "card_radius",
        label: "Radius",
        type: "length",
        placeholder: "16px",
      },
      {
        key: "card_shadow",
        label: "Shadow",
        type: "text",
        placeholder: "0 8px 28px rgba(0,0,0,0.22)",
      },
      {
        key: "card_text_color",
        label: "Text",
        type: "color",
        placeholder: "#f9fafb",
      },
      {
        key: "card_icon_color",
        label: "Icons",
        type: "color",
        placeholder: "#38bdf8",
      },
    ],
  },
  {
    id: "mushroom",
    title: "Mushroom",
    icon: "mdi:mushroom-outline",
    settings: [
      {
        key: "mushroom_card_radius",
        label: "Card radius",
        type: "length",
        placeholder: "18px",
      },
      {
        key: "mushroom_shape_color",
        label: "Shape background",
        type: "color",
        placeholder: "rgba(3,169,244,0.18)",
      },
      {
        key: "mushroom_icon_color",
        label: "Icons",
        type: "color",
        placeholder: "#03a9f4",
      },
      {
        key: "mushroom_primary_text_color",
        label: "Primary text",
        type: "color",
        placeholder: "#f9fafb",
      },
      {
        key: "mushroom_secondary_text_color",
        label: "Secondary text",
        type: "color",
        placeholder: "#cbd5e1",
      },
    ],
  },
  {
    id: "header",
    title: "Header / Toolbar",
    icon: "mdi:view-headline",
    settings: [
      {
        key: "header_background",
        label: "Background",
        type: "color",
        placeholder: "#0f172a",
      },
      {
        key: "header_text_color",
        label: "Text",
        type: "color",
        placeholder: "#ffffff",
      },
      {
        key: "header_icon_color",
        label: "Icons",
        type: "color",
        placeholder: "#ffffff",
      },
      {
        key: "header_accent_color",
        label: "Accent",
        type: "color",
        placeholder: "#38bdf8",
      },
    ],
  },
];

export const SETTING_DEFINITIONS = new Map(
  SETTING_GROUPS.flatMap((group) =>
    group.settings.map((setting) => [setting.key, { ...setting, group: group.id }])
  )
);

export const DEFAULT_SETTINGS = Object.fromEntries(
  [...SETTING_DEFINITIONS.keys()].map((key) => [key, null])
);

const ROOT_VARIABLES = new Map([
  ["sidebar_background", "--sidebar-background-color"],
  ["sidebar_icon_color", "--sidebar-icon-color"],
  ["sidebar_text_color", "--sidebar-text-color"],
  ["sidebar_selected_color", "--sidebar-selected-icon-color"],
  ["primary_color", "--primary-color"],
  ["accent_color", "--accent-color"],
  ["primary_background_color", "--primary-background-color"],
  ["secondary_background_color", "--secondary-background-color"],
  ["card_background_color", "--card-background-color"],
  ["primary_text_color", "--primary-text-color"],
  ["secondary_text_color", "--secondary-text-color"],
  ["disabled_text_color", "--disabled-text-color"],
  ["divider_color", "--divider-color"],
  ["card_background", "--ha-card-background"],
  ["card_radius", "--ha-card-border-radius"],
  ["card_shadow", "--ha-card-box-shadow"],
  ["mushroom_card_radius", "--mush-card-border-radius"],
  ["mushroom_primary_text_color", "--mush-card-primary-color"],
  ["mushroom_secondary_text_color", "--mush-card-secondary-color"],
  ["header_background", "--app-header-background-color"],
  ["header_text_color", "--app-header-text-color"],
  ["header_icon_color", "--app-header-icon-color"],
  ["header_accent_color", "--app-header-selection-bar-color"],
]);

const CUSTOM_VARIABLES = new Map([
  ["sidebar_background", "--ha-theme-tweaker-sidebar-background"],
  ["sidebar_icon_color", "--ha-theme-tweaker-sidebar-icon-color"],
  ["sidebar_text_color", "--ha-theme-tweaker-sidebar-text-color"],
  ["sidebar_selected_color", "--ha-theme-tweaker-sidebar-selected-color"],
  ["sidebar_hover_color", "--ha-theme-tweaker-sidebar-hover-color"],
  ["sidebar_badge_background", "--ha-theme-tweaker-sidebar-badge-background"],
  ["sidebar_badge_text", "--ha-theme-tweaker-sidebar-badge-text"],
  ["sidebar_badge_border_color", "--ha-theme-tweaker-sidebar-badge-border-color"],
  ["sidebar_badge_radius", "--ha-theme-tweaker-sidebar-badge-radius"],
  ["sidebar_badge_font_size", "--ha-theme-tweaker-sidebar-badge-font-size"],
  ["sidebar_badge_font_weight", "--ha-theme-tweaker-sidebar-badge-font-weight"],
  ["sidebar_badge_min_width", "--ha-theme-tweaker-sidebar-badge-min-width"],
  ["sidebar_badge_height", "--ha-theme-tweaker-sidebar-badge-height"],
  ["card_background", "--ha-theme-tweaker-card-background"],
  ["card_border", "--ha-theme-tweaker-card-border"],
  ["card_radius", "--ha-theme-tweaker-card-radius"],
  ["card_shadow", "--ha-theme-tweaker-card-shadow"],
  ["card_text_color", "--ha-theme-tweaker-card-text-color"],
  ["card_icon_color", "--ha-theme-tweaker-card-icon-color"],
  ["mushroom_card_radius", "--ha-theme-tweaker-mushroom-card-radius"],
  ["mushroom_shape_color", "--ha-theme-tweaker-mushroom-shape-color"],
  ["mushroom_icon_color", "--ha-theme-tweaker-mushroom-icon-color"],
  [
    "mushroom_primary_text_color",
    "--ha-theme-tweaker-mushroom-primary-text-color",
  ],
  [
    "mushroom_secondary_text_color",
    "--ha-theme-tweaker-mushroom-secondary-text-color",
  ],
  ["header_background", "--ha-theme-tweaker-header-background"],
  ["header_text_color", "--ha-theme-tweaker-header-text-color"],
  ["header_icon_color", "--ha-theme-tweaker-header-icon-color"],
  ["header_accent_color", "--ha-theme-tweaker-header-accent-color"],
]);

const CARD_KEYS = [
  "card_background",
  "card_border",
  "card_radius",
  "card_shadow",
  "card_text_color",
  "card_icon_color",
];

const MUSHROOM_KEYS = [
  "mushroom_card_radius",
  "mushroom_shape_color",
  "mushroom_icon_color",
  "mushroom_primary_text_color",
  "mushroom_secondary_text_color",
];

const HEADER_KEYS = [
  "header_background",
  "header_text_color",
  "header_icon_color",
  "header_accent_color",
];

const SIDEBAR_BADGE_KEYS = [
  "sidebar_badge_background",
  "sidebar_badge_text",
  "sidebar_badge_border_color",
  "sidebar_badge_radius",
  "sidebar_badge_font_size",
  "sidebar_badge_font_weight",
  "sidebar_badge_min_width",
  "sidebar_badge_height",
];

const UNSAFE_CSS_VALUE = /[{};<>]/;

export function sanitizeCssValue(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  if (!normalized || normalized.length > 180 || UNSAFE_CSS_VALUE.test(normalized)) {
    return null;
  }

  return normalized;
}

export function normalizeSettings(settings = {}) {
  return Object.fromEntries(
    Object.keys(DEFAULT_SETTINGS).map((key) => [
      key,
      sanitizeCssValue(settings[key]),
    ])
  );
}

function hasAny(settings, keys) {
  return keys.some((key) => sanitizeCssValue(settings[key]) !== null);
}

function declaration(name, value) {
  const safeValue = sanitizeCssValue(value);
  return safeValue === null ? "" : `  ${name}: ${safeValue} !important;`;
}

function declarationsFor(settings) {
  const declarations = [];
  for (const [key, variable] of ROOT_VARIABLES) {
    const line = declaration(variable, settings[key]);
    if (line) {
      declarations.push(line);
    }
  }
  for (const [key, variable] of CUSTOM_VARIABLES) {
    const line = declaration(variable, settings[key]);
    if (line) {
      declarations.push(line);
    }
  }
  return declarations;
}

export function generateGlobalCss(rawSettings = {}) {
  const settings = normalizeSettings(rawSettings);
  const rootDeclarations = declarationsFor(settings);
  const css = [
    `:root,
html,
body,
home-assistant,
home-assistant-main {
${rootDeclarations.join("\n") || "  --ha-theme-tweaker-active: 1;"}
}`,
  ];

  if (hasAny(settings, CARD_KEYS)) {
    const cardRules = [];
    if (settings.card_background) {
      cardRules.push(
        "  background: var(--ha-theme-tweaker-card-background) !important;"
      );
    }
    if (settings.card_border) {
      cardRules.push("  border: var(--ha-theme-tweaker-card-border) !important;");
    }
    if (settings.card_radius) {
      cardRules.push(
        "  border-radius: var(--ha-theme-tweaker-card-radius) !important;"
      );
    }
    if (settings.card_shadow) {
      cardRules.push(
        "  box-shadow: var(--ha-theme-tweaker-card-shadow) !important;"
      );
    }
    if (settings.card_text_color) {
      cardRules.push("  color: var(--ha-theme-tweaker-card-text-color) !important;");
    }
    if (settings.card_icon_color) {
      cardRules.push(
        "  --paper-item-icon-color: var(--ha-theme-tweaker-card-icon-color) !important;"
      );
      cardRules.push(
        "  --state-icon-color: var(--ha-theme-tweaker-card-icon-color) !important;"
      );
    }
    css.push(`ha-card {\n${cardRules.join("\n")}\n}`);
  }

  if (hasAny(settings, MUSHROOM_KEYS)) {
    const mushroomRules = [];
    if (settings.mushroom_card_radius) {
      mushroomRules.push(
        "  --mush-card-border-radius: var(--ha-theme-tweaker-mushroom-card-radius) !important;"
      );
      mushroomRules.push(
        "  --ha-card-border-radius: var(--ha-theme-tweaker-mushroom-card-radius) !important;"
      );
    }
    if (settings.mushroom_shape_color) {
      mushroomRules.push(
        "  --mushroom-shape-color: var(--ha-theme-tweaker-mushroom-shape-color) !important;"
      );
      mushroomRules.push(
        "  --mush-shape-color: var(--ha-theme-tweaker-mushroom-shape-color) !important;"
      );
    }
    if (settings.mushroom_icon_color) {
      mushroomRules.push(
        "  --mushroom-icon-color: var(--ha-theme-tweaker-mushroom-icon-color) !important;"
      );
      mushroomRules.push(
        "  --mush-icon-color: var(--ha-theme-tweaker-mushroom-icon-color) !important;"
      );
    }
    if (settings.mushroom_primary_text_color) {
      mushroomRules.push(
        "  --primary-text-color: var(--ha-theme-tweaker-mushroom-primary-text-color) !important;"
      );
    }
    if (settings.mushroom_secondary_text_color) {
      mushroomRules.push(
        "  --secondary-text-color: var(--ha-theme-tweaker-mushroom-secondary-text-color) !important;"
      );
    }
    css.push(
      `mushroom-card,
mushroom-template-card,
mushroom-entity-card,
mushroom-light-card,
mushroom-chips-card {
${mushroomRules.join("\n")}
}`
    );
  }

  if (hasAny(settings, HEADER_KEYS)) {
    const headerRules = [];
    if (settings.header_background) {
      headerRules.push(
        "  background: var(--ha-theme-tweaker-header-background) !important;"
      );
      headerRules.push(
        "  --app-header-background-color: var(--ha-theme-tweaker-header-background) !important;"
      );
    }
    if (settings.header_text_color) {
      headerRules.push(
        "  color: var(--ha-theme-tweaker-header-text-color) !important;"
      );
      headerRules.push(
        "  --primary-text-color: var(--ha-theme-tweaker-header-text-color) !important;"
      );
    }
    if (settings.header_icon_color) {
      headerRules.push(
        "  --paper-item-icon-color: var(--ha-theme-tweaker-header-icon-color) !important;"
      );
      headerRules.push(
        "  --mdc-icon-button-ink-color: var(--ha-theme-tweaker-header-icon-color) !important;"
      );
    }
    if (settings.header_accent_color) {
      headerRules.push(
        "  --app-header-selection-bar-color: var(--ha-theme-tweaker-header-accent-color) !important;"
      );
      headerRules.push(
        "  --accent-color: var(--ha-theme-tweaker-header-accent-color) !important;"
      );
    }
    css.push(
      `app-header,
app-toolbar,
ha-app-layout app-header,
ha-app-layout app-toolbar {
${headerRules.join("\n")}
}`
    );
  }

  return `${css.join("\n\n")}\n`;
}

export function generateSidebarShadowCss(rawSettings = {}) {
  const settings = normalizeSettings(rawSettings);
  const css = [];

  if (settings.sidebar_hover_color) {
    css.push(`
ha-list-item-button:hover::before {
  border-radius: var(--ha-border-radius-sm);
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: "";
  background-color: var(--ha-theme-tweaker-sidebar-hover-color);
  opacity: 0.12;
}`);
  }

  if (hasAny(settings, SIDEBAR_BADGE_KEYS)) {
    css.push(`
.badge {
  background-color: var(--ha-theme-tweaker-sidebar-badge-background, var(--accent-color)) !important;
  color: var(--ha-theme-tweaker-sidebar-badge-text, var(--text-accent-color, var(--text-primary-color))) !important;
  border: 1px solid var(--ha-theme-tweaker-sidebar-badge-border-color, transparent) !important;
  border-radius: var(--ha-theme-tweaker-sidebar-badge-radius, var(--ha-border-radius-xl)) !important;
  font-size: var(--ha-theme-tweaker-sidebar-badge-font-size, 0.75em) !important;
  font-weight: var(--ha-theme-tweaker-sidebar-badge-font-weight, var(--ha-font-weight-normal)) !important;
  min-width: var(--ha-theme-tweaker-sidebar-badge-min-width, var(--ha-space-2)) !important;
  height: var(--ha-theme-tweaker-sidebar-badge-height, auto) !important;
  box-sizing: border-box;
}

ha-svg-icon + .badge {
  border-radius: var(--ha-theme-tweaker-sidebar-badge-radius, var(--ha-border-radius-md)) !important;
  font-size: var(--ha-theme-tweaker-sidebar-badge-font-size, 0.65em) !important;
}`);
  }

  return `${css.join("\n")}\n`;
}

export function generateHeaderShadowCss(rawSettings = {}) {
  const settings = normalizeSettings(rawSettings);
  if (!hasAny(settings, HEADER_KEYS)) {
    return "";
  }

  const rules = [];
  if (settings.header_background) {
    rules.push(
      "  background: var(--ha-theme-tweaker-header-background) !important;"
    );
  }
  if (settings.header_text_color) {
    rules.push("  color: var(--ha-theme-tweaker-header-text-color) !important;");
    rules.push(
      "  --primary-text-color: var(--ha-theme-tweaker-header-text-color) !important;"
    );
  }
  if (settings.header_icon_color) {
    rules.push(
      "  --paper-item-icon-color: var(--ha-theme-tweaker-header-icon-color) !important;"
    );
    rules.push(
      "  --mdc-icon-button-ink-color: var(--ha-theme-tweaker-header-icon-color) !important;"
    );
  }
  if (settings.header_accent_color) {
    rules.push(
      "  --accent-color: var(--ha-theme-tweaker-header-accent-color) !important;"
    );
    rules.push(
      "  --app-header-selection-bar-color: var(--ha-theme-tweaker-header-accent-color) !important;"
    );
  }

  return `
app-header,
app-toolbar,
.toolbar,
header {
${rules.join("\n")}
}
`;
}
