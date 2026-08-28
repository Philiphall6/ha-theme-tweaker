import {
  generateGlobalCss,
  generateHeaderShadowCss,
  generateSidebarShadowCss,
  normalizeSettings,
} from "./styles.js";

const ROOT_STYLE_ID = "ha-theme-tweaker-root-style";
const SIDEBAR_STYLE_ID = "ha-theme-tweaker-sidebar-style";
const HEADER_STYLE_ID = "ha-theme-tweaker-header-style";

let currentSettings = normalizeSettings();
let watcherStarted = false;
let applyQueued = false;

function upsertStyle(root, id, cssText) {
  if (!root) {
    return;
  }

  if (!cssText.trim()) {
    root.getElementById?.(id)?.remove();
    root.querySelector?.(`#${id}`)?.remove();
    return;
  }

  let style = root.getElementById?.(id) || root.querySelector?.(`#${id}`);
  if (!style) {
    style = document.createElement("style");
    style.id = id;
    root.appendChild(style);
  }

  if (style.textContent !== cssText) {
    style.textContent = cssText;
  }
}

function queryDeep(selector, root = document, matches = []) {
  if (!root.querySelectorAll) {
    return matches;
  }

  matches.push(...root.querySelectorAll(selector));
  for (const element of root.querySelectorAll("*")) {
    if (element.shadowRoot) {
      queryDeep(selector, element.shadowRoot, matches);
    }
  }

  return matches;
}

function injectSidebarStyles() {
  const cssText = generateSidebarShadowCss(currentSettings);
  for (const sidebar of queryDeep("ha-sidebar")) {
    if (sidebar.shadowRoot) {
      upsertStyle(sidebar.shadowRoot, SIDEBAR_STYLE_ID, cssText);
    }
  }
}

function injectHeaderStyles() {
  const cssText = generateHeaderShadowCss(currentSettings);
  const hosts = queryDeep(
    "home-assistant, home-assistant-main, ha-panel-lovelace, hui-root, app-header-layout, ha-app-layout"
  );

  for (const host of hosts) {
    if (host.shadowRoot) {
      upsertStyle(host.shadowRoot, HEADER_STYLE_ID, cssText);
    }
  }
}

export function applyThemeTweakerStyles(settings = currentSettings) {
  currentSettings = normalizeSettings(settings);
  upsertStyle(document.head, ROOT_STYLE_ID, generateGlobalCss(currentSettings));
  injectSidebarStyles();
  injectHeaderStyles();
}

function queueApply() {
  if (applyQueued) {
    return;
  }

  applyQueued = true;
  window.requestAnimationFrame(() => {
    applyQueued = false;
    applyThemeTweakerStyles();
  });
}

export function startThemeTweakerWatcher() {
  if (watcherStarted) {
    return;
  }

  watcherStarted = true;

  // Home Assistant's sidebar badges live in ha-sidebar's open shadowRoot.
  // This module is the only place that touches internal frontend DOM, making
  // the fragile part easy to update if upstream markup changes.
  const observer = new MutationObserver(queueApply);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  window.addEventListener("location-changed", queueApply);
  document.addEventListener("visibilitychange", queueApply);
  window.setInterval(queueApply, 2000);
}
