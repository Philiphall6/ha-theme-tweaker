import { applyThemeTweakerStyles, startThemeTweakerWatcher } from "./shadow-dom.js";
import { WS_TYPES } from "./styles.js";
import { cloneSettings, extractSettings } from "./components/value-utils.js";

const STATE_KEY = "__haThemeTweaker";
const previous = window[STATE_KEY];
previous?.stop?.();
const controller = new AbortController();
const state = window[STATE_KEY] = {
  connection: null,
  settings: cloneSettings(previous?.settings),
  loadedConnection: null,
  unsubscribe: null,
};
let retryTimer = 0;
let retries = 0;
let running = false;
const stopWatcher = startThemeTweakerWatcher();

function publishSettings(response) {
  const settings = extractSettings(response);
  if (!settings || controller.signal.aborted) return;
  state.settings = cloneSettings(settings);
  applyThemeTweakerStyles(state.settings);
  window.dispatchEvent(new CustomEvent("ha-theme-tweaker-settings-updated", {
    detail: { settings: state.settings },
  }));
}

async function tick() {
  if (running || controller.signal.aborted) return;
  clearTimeout(retryTimer);
  const connection = document.querySelector("home-assistant")?.hass?.connection;
  if (!connection?.sendMessagePromise) { scheduleRetry(); return; }
  if (state.connection !== connection) {
    state.connection?.removeEventListener?.("ready", refresh);
    state.unsubscribe?.(); state.unsubscribe = null;
    state.loadedConnection = null;
    state.connection = connection;
    connection.addEventListener?.("ready", refresh);
  }
  running = true;
  try {
    if (state.loadedConnection !== connection) {
      const response = await connection.sendMessagePromise({ type: WS_TYPES.getSettings });
      if (controller.signal.aborted) return;
      publishSettings(response);
      state.loadedConnection = connection;
    }
    if (!state.unsubscribe && connection.subscribeMessage) {
      const unsubscribe = await connection.subscribeMessage(publishSettings, { type: WS_TYPES.subscribe });
      if (controller.signal.aborted || state.connection !== connection) unsubscribe();
      else state.unsubscribe = unsubscribe;
    }
    retries = 0;
  } catch (err) {
    console.warn("HA Theme Tweaker could not synchronize settings", err);
    scheduleRetry();
  } finally {
    running = false;
  }
}

function scheduleRetry() {
  if (controller.signal.aborted || retries >= 8) return;
  clearTimeout(retryTimer);
  retryTimer = setTimeout(tick, Math.min(250 * 2 ** retries++, 5000));
}

function refresh() {
  retries = 0;
  if (!document.hidden) tick();
}

state.stop = () => {
  controller.abort(); clearTimeout(retryTimer);
  state.connection?.removeEventListener?.("ready", refresh);
  state.unsubscribe?.(); state.unsubscribe = null;
  stopWatcher();
};
window.addEventListener("ha-theme-tweaker-preview", (event) => {
  if (event.detail?.settings) applyThemeTweakerStyles(event.detail.settings);
}, { signal: controller.signal });
window.addEventListener("location-changed", refresh, { signal: controller.signal });
document.addEventListener("visibilitychange", refresh, { signal: controller.signal });
applyThemeTweakerStyles(state.settings);
queueMicrotask(tick);
