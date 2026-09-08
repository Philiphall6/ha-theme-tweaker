import {
  generateGlobalCss,
  generateHeaderShadowCss,
  generateSidebarShadowCss,
  normalizeSettings,
} from "./styles.js";

const ROOT_STYLE_ID = "ha-theme-tweaker-root-style";
const SIDEBAR_STYLE_ID = "ha-theme-tweaker-sidebar-style";
const HEADER_STYLE_ID = "ha-theme-tweaker-header-style";
// Only cross application-shell boundaries. Lovelace cards are never inspected.
const SHELL_SELECTOR = "home-assistant, home-assistant-main, ha-drawer, app-drawer, partial-panel-resolver, ha-panel-lovelace, hui-root, app-header-layout, ha-app-layout, ha-sidebar";
const HEADER_HOSTS = new Set(["home-assistant", "home-assistant-main", "ha-panel-lovelace", "hui-root", "app-header-layout", "ha-app-layout"]);
let currentSettings = normalizeSettings();
let cssCache;
let stopWatcher;
let applyFrame = 0;
const observers = new Map();

function upsertStyle(root, id, cssText) {
  if (!root) return;
  let style = root.getElementById?.(id) || root.querySelector?.(`#${id}`);
  if (!cssText.trim()) { style?.remove(); return; }
  if (!style) {
    style = document.createElement("style");
    style.id = id;
    style.textContent = cssText;
    root.appendChild(style);
  } else if (style.textContent !== cssText) {
    style.textContent = cssText;
  }
}

function shellRoots(root = document, roots = new Set()) {
  if (roots.has(root)) return roots;
  roots.add(root);
  // Sidebar descendants cannot contain a header; its own root is styled below.
  if (root.host?.localName === "ha-sidebar") return roots;
  for (const host of root.querySelectorAll(SHELL_SELECTOR)) {
    if (host.shadowRoot) shellRoots(host.shadowRoot, roots);
  }
  return roots;
}

function relevantMutation(records) {
  return records.some((record) => [...record.addedNodes, ...record.removedNodes].some(
    (node) => node.nodeType === Node.ELEMENT_NODE && node.localName !== "style"
  ));
}

export function applyThemeTweakerStyles(settings = currentSettings) {
  if (settings !== currentSettings || !cssCache) {
    currentSettings = normalizeSettings(settings);
    cssCache = {
      global: generateGlobalCss(currentSettings),
      sidebar: generateSidebarShadowCss(currentSettings),
      header: generateHeaderShadowCss(currentSettings),
    };
  }
  upsertStyle(document.head, ROOT_STYLE_ID, cssCache.global);
  const roots = shellRoots();
  for (const [root, observer] of observers) {
    if (!roots.has(root)) { observer.disconnect(); observers.delete(root); }
  }
  for (const root of roots) {
    const name = root.host?.localName;
    if (name === "ha-sidebar") upsertStyle(root, SIDEBAR_STYLE_ID, cssCache.sidebar);
    if (HEADER_HOSTS.has(name)) upsertStyle(root, HEADER_STYLE_ID, cssCache.header);
    if (stopWatcher && name !== "ha-sidebar" && !observers.has(root)) {
      const observer = new MutationObserver((records) => {
        if (relevantMutation(records)) queueApply();
      });
      observer.observe(root === document ? document.documentElement : root, { childList: true, subtree: true });
      observers.set(root, observer);
    }
  }
}

function queueApply() {
  if (applyFrame || document.hidden) return;
  applyFrame = requestAnimationFrame(() => {
    applyFrame = 0;
    applyThemeTweakerStyles();
  });
}

export function startThemeTweakerWatcher() {
  if (stopWatcher) return stopWatcher;
  const controller = new AbortController();
  const timers = new Set();
  const refresh = () => {
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
    queueApply();
    // Bounded settling retries handle a shell attaching its shadow root after insertion.
    for (const delay of [100, 500]) {
      const timer = setTimeout(() => { timers.delete(timer); queueApply(); }, delay);
      timers.add(timer);
    }
  };
  stopWatcher = () => {
    controller.abort();
    cancelAnimationFrame(applyFrame); applyFrame = 0;
    for (const timer of timers) clearTimeout(timer);
    for (const observer of observers.values()) observer.disconnect();
    observers.clear(); stopWatcher = undefined;
  };
  window.addEventListener("location-changed", refresh, { signal: controller.signal });
  document.addEventListener("visibilitychange", refresh, { signal: controller.signal });
  for (const tag of SHELL_SELECTOR.split(", ")) {
    customElements.whenDefined(tag).then(() => { if (!controller.signal.aborted) refresh(); });
  }
  refresh();
  return stopWatcher;
}
