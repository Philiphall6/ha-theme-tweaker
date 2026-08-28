import { applyThemeTweakerStyles, startThemeTweakerWatcher } from "./shadow-dom.js";
import { WS_TYPES } from "./styles.js";
import { cloneSettings, extractSettings } from "./components/value-utils.js";

const STATE_KEY = "__haThemeTweaker";

const state =
  window[STATE_KEY] ||
  (window[STATE_KEY] = {
    connection: null,
    hass: null,
    settings: cloneSettings(),
    loadedConnection: null,
    loading: false,
    unsubscribe: null,
    themeFingerprint: "",
  });

function findHass(root = document) {
  const selectors = [
    "home-assistant",
    "home-assistant-main",
    "ha-panel-lovelace",
    "hui-root",
  ];

  for (const selector of selectors) {
    const element = root.querySelector?.(selector);
    if (element?.hass) {
      return element.hass;
    }
    if (element?.shadowRoot) {
      const hass = findHass(element.shadowRoot);
      if (hass) {
        return hass;
      }
    }
  }

  for (const element of root.querySelectorAll?.("*") ?? []) {
    if (element.hass) {
      return element.hass;
    }
    if (element.shadowRoot) {
      const hass = findHass(element.shadowRoot);
      if (hass) {
        return hass;
      }
    }
  }

  return null;
}

function themeFingerprint(hass) {
  const themes = hass?.themes ?? {};
  return JSON.stringify({
    theme: themes.theme ?? themes.active_theme ?? "",
    dark: themes.darkMode ?? themes.dark_mode ?? "",
    defaultTheme: themes.default_theme ?? "",
  });
}

function publishSettings(settings) {
  state.settings = cloneSettings(settings);
  applyThemeTweakerStyles(state.settings);
  window.dispatchEvent(
    new CustomEvent("ha-theme-tweaker-settings-updated", {
      detail: { settings: state.settings },
    })
  );
}

async function loadSettings(hass) {
  if (!hass?.connection?.sendMessagePromise) {
    return;
  }
  if (state.loading || state.loadedConnection === hass.connection) {
    return;
  }

  state.loading = true;
  try {
    const response = await hass.connection.sendMessagePromise({
      type: WS_TYPES.getSettings,
    });
    const settings = extractSettings(response);
    if (settings) {
      publishSettings(settings);
    }
    state.loadedConnection = hass.connection;
  } catch (err) {
    console.warn("HA Theme Tweaker could not load settings", err);
  } finally {
    state.loading = false;
  }
}

async function subscribeUpdates(hass) {
  if (!hass?.connection || state.connection === hass.connection) {
    return;
  }

  if (state.unsubscribe) {
    state.unsubscribe();
    state.unsubscribe = null;
  }

  state.connection = hass.connection;
  state.loadedConnection = null;

  if (!hass.connection.subscribeMessage) {
    return;
  }

  try {
    state.unsubscribe = await hass.connection.subscribeMessage((message) => {
      const settings = extractSettings(message);
      if (settings) {
        publishSettings(settings);
      }
    }, { type: WS_TYPES.subscribe });
  } catch (err) {
    console.warn("HA Theme Tweaker could not subscribe to updates", err);
  }
}

function tick() {
  const hass = findHass();
  if (!hass) {
    return;
  }

  state.hass = hass;
  const nextFingerprint = themeFingerprint(hass);
  if (nextFingerprint !== state.themeFingerprint) {
    state.themeFingerprint = nextFingerprint;
    applyThemeTweakerStyles(state.settings);
  }

  loadSettings(hass);
  subscribeUpdates(hass);
}

window.addEventListener("ha-theme-tweaker-preview", (event) => {
  if (event.detail?.settings) {
    applyThemeTweakerStyles(event.detail.settings);
  }
});

startThemeTweakerWatcher();
applyThemeTweakerStyles(state.settings);
window.setInterval(tick, 1200);
queueMicrotask(tick);
