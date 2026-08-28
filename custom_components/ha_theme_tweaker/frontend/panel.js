import { applyThemeTweakerStyles } from "./shadow-dom.js";
import {
  SETTING_DEFINITIONS,
  SETTING_GROUPS,
  WS_TYPES,
  normalizeSettingValue,
} from "./styles.js";
import {
  cloneSettings,
  colorToAlpha,
  colorToHex,
  colorWithAlpha,
  escapeHtml,
  extractSettings,
  normalizedInputValue,
  settingsChanged,
} from "./components/value-utils.js";

const UNSAFE_CSS_VALUE = /[{};<>]/;

class HaThemeTweakerPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._loaded = false;
    this._loading = false;
    this._activeGroup = "sidebar";
    this._focusedKey = "";
    this._saved = cloneSettings();
    this._draft = cloneSettings();
    this._invalidKeys = new Set();
    this._status = "";
    this._statusKind = "neutral";
    this._themeName = "";
    this._handleExternalUpdate = this._handleExternalUpdate.bind(this);
  }

  set hass(value) {
    this._hass = value;
    const nextTheme = this._computeThemeName();
    if (nextTheme !== this._themeName) {
      this._themeName = nextTheme;
      this._updateThemeLabel();
      this._syncControls();
    }
    this._loadSettings();
  }

  get hass() {
    return this._hass;
  }

  connectedCallback() {
    window.addEventListener(
      "ha-theme-tweaker-settings-updated",
      this._handleExternalUpdate
    );
    this._themeName = this._computeThemeName();
    this._render();
    this._loadSettings();
  }

  disconnectedCallback() {
    window.removeEventListener(
      "ha-theme-tweaker-settings-updated",
      this._handleExternalUpdate
    );
  }

  _computeThemeName() {
    const themes = this._hass?.themes ?? {};
    return (
      themes.theme ||
      themes.active_theme ||
      themes.default_theme ||
      this._hass?.selectedTheme ||
      "theme"
    );
  }

  _readCssVariable(name) {
    if (!name) {
      return "";
    }

    for (const root of [document.documentElement, document.body, this]) {
      if (!root) {
        continue;
      }
      const value = getComputedStyle(root).getPropertyValue(name).trim();
      if (value) {
        return value;
      }
    }

    return "";
  }

  async _loadSettings() {
    if (this._loading || this._loaded || !this._hass?.connection) {
      return;
    }

    this._loading = true;
    this._setStatus("Loading...", "neutral");
    try {
      const response = await this._hass.connection.sendMessagePromise({
        type: WS_TYPES.getSettings,
      });
      const settings = extractSettings(response);
      if (settings) {
        this._saved = cloneSettings(settings);
        this._draft = cloneSettings(settings);
        applyThemeTweakerStyles(this._draft);
      }
      this._loaded = true;
      this._setStatus("Ready", "success");
      this._render();
    } catch (err) {
      this._setStatus(`Error: ${err.message ?? err}`, "error");
    } finally {
      this._loading = false;
    }
  }

  _handleExternalUpdate(event) {
    const settings = event.detail?.settings;
    if (!settings) {
      return;
    }

    this._saved = cloneSettings(settings);
    if (!this._isDirty()) {
      this._draft = cloneSettings(settings);
      this._syncControls();
    }
  }

  _isDirty() {
    return settingsChanged(this._draft, this._saved);
  }

  _validateValue(key, value) {
    const setting = SETTING_DEFINITIONS.get(key);
    const trimmed = String(value ?? "").trim();
    if (!trimmed) {
      this._invalidKeys.delete(key);
      return null;
    }
    if (
      setting?.type === "deviceScope" &&
      trimmed !== "desktop" &&
      trimmed !== "mobile"
    ) {
      this._invalidKeys.add(key);
      return "Unsupported device scope";
    }
    if (trimmed.length > 180 || UNSAFE_CSS_VALUE.test(trimmed)) {
      this._invalidKeys.add(key);
      return "Unsupported CSS value";
    }
    this._invalidKeys.delete(key);
    return null;
  }

  _setDraftValue(key, value) {
    const error = this._validateValue(key, value);
    this._setRowError(key, error);
    if (error) {
      this._updateDirtyState();
      return;
    }

    this._draft[key] = normalizeSettingValue(key, value);
    applyThemeTweakerStyles(this._draft);
    this._updatePreviewScope();
    window.dispatchEvent(
      new CustomEvent("ha-theme-tweaker-preview", {
        detail: { settings: this._draft },
      })
    );
    this._updateDirtyState();
  }

  _resetOne(key) {
    this._invalidKeys.delete(key);
    this._draft[key] = null;
    this._syncControl(key);
    this._setRowError(key, null);
    applyThemeTweakerStyles(this._draft);
    this._updatePreviewScope();
    this._updateDirtyState();
  }

  async _save() {
    if (this._invalidKeys.size > 0) {
      this._setStatus("Fix invalid values before saving.", "error");
      return;
    }

    if (!this._hass?.connection) {
      this._setStatus("Home Assistant connection unavailable.", "error");
      return;
    }

    this._setStatus("Saving...", "neutral");
    try {
      const response = await this._hass.connection.sendMessagePromise({
        type: WS_TYPES.saveSettings,
        settings: this._draft,
      });
      const settings = extractSettings(response) ?? this._draft;
      this._saved = cloneSettings(settings);
      this._draft = cloneSettings(settings);
      applyThemeTweakerStyles(this._draft);
      this._setStatus("Saved", "success");
      this._syncControls();
      this._updateDirtyState();
    } catch (err) {
      this._setStatus(`Error: ${err.message ?? err}`, "error");
    }
  }

  async _resetAll() {
    if (!window.confirm("Reset all overrides?")) {
      return;
    }

    if (!this._hass?.connection) {
      this._setStatus("Home Assistant connection unavailable.", "error");
      return;
    }

    this._setStatus("Resetting...", "neutral");
    try {
      const response = await this._hass.connection.sendMessagePromise({
        type: WS_TYPES.resetAll,
      });
      const settings = extractSettings(response) ?? {};
      this._saved = cloneSettings(settings);
      this._draft = cloneSettings(settings);
      this._invalidKeys.clear();
      applyThemeTweakerStyles(this._draft);
      this._setStatus("Reset", "success");
      this._render();
    } catch (err) {
      this._setStatus(`Error: ${err.message ?? err}`, "error");
    }
  }

  _setStatus(message, kind = "neutral") {
    this._status = message;
    this._statusKind = kind;
    for (const status of this.shadowRoot.querySelectorAll(".status")) {
      status.textContent = message;
      status.dataset.kind = kind;
    }
  }

  _updateThemeLabel() {
    const label = this.shadowRoot.querySelector(".theme-name");
    if (label) {
      label.textContent = this._themeName;
    }
  }

  _updateDirtyState() {
    const dirty = this._isDirty();
    const save = this.shadowRoot.querySelector("[data-action='save']");
    if (save) {
      save.disabled = !dirty || this._invalidKeys.size > 0;
    }
    const dirtyLabel = this.shadowRoot.querySelector(".dirty-label");
    if (dirtyLabel) {
      dirtyLabel.textContent = dirty ? "Modified" : "Up to date";
      dirtyLabel.dataset.dirty = dirty ? "true" : "false";
    }
  }

  _setRowError(key, message) {
    const row = this.shadowRoot.querySelector(`[data-row="${key}"]`);
    if (!row) {
      return;
    }
    row.classList.toggle("invalid", Boolean(message));
    const error = row.querySelector(".row-error");
    if (error) {
      error.textContent = message ?? "";
    }
  }

  _syncControls() {
    for (const key of SETTING_DEFINITIONS.keys()) {
      this._syncControl(key);
    }
    this._updateDirtyState();
  }

  _syncControl(key) {
    const setting = SETTING_DEFINITIONS.get(key);
    const value = normalizedInputValue(this._draft[key]);
    const inheritedValue = this._readCssVariable(setting?.cssVariable);
    const row = this.shadowRoot.querySelector(`[data-row="${key}"]`);
    if (!row) {
      return;
    }

    const textInput = row.querySelector("[data-role='value']");
    const colorInput = row.querySelector("[data-role='color']");
    const alphaInput = row.querySelector("[data-role='alpha']");
    const alphaValue = row.querySelector("[data-role='alpha-value']");
    const select = row.querySelector("[data-role='select']");

    if (textInput) {
      textInput.value = value;
      textInput.placeholder = inheritedValue || setting?.placeholder || "";
    }
    if (colorInput) {
      colorInput.value = colorToHex(value || inheritedValue);
    }
    if (alphaInput) {
      alphaInput.value = String(colorToAlpha(value || inheritedValue));
    }
    if (alphaValue) {
      alphaValue.textContent = `${colorToAlpha(value || inheritedValue)}%`;
    }
    if (select) {
      select.value = value;
    }
  }

  _renderField(setting) {
    const value = normalizedInputValue(this._draft[setting.key]);
    const inheritedValue = this._readCssVariable(setting.cssVariable);
    const placeholder = escapeHtml(inheritedValue || setting.placeholder || "");
    const swatchValue = value || inheritedValue;

    if (setting.type === "deviceScope") {
      return `
        <select data-role="select" data-key="${setting.key}" aria-label="${escapeHtml(setting.label)}">
          <option value="">Both</option>
          <option value="desktop">Web</option>
          <option value="mobile">Mobile</option>
        </select>
      `;
    }

    if (setting.type === "color") {
      const alphaValue = colorToAlpha(swatchValue);
      return `
        <div class="color-control">
          <div class="field color-field">
            <input data-role="color" data-key="${setting.key}" type="color" value="${colorToHex(swatchValue)}" aria-label="${escapeHtml(setting.label)}">
            <input data-role="value" data-key="${setting.key}" type="text" value="${escapeHtml(value)}" placeholder="${placeholder}" spellcheck="false">
          </div>
          <div class="alpha-field">
            <ha-icon icon="mdi:opacity"></ha-icon>
            <input data-role="alpha" data-key="${setting.key}" type="range" min="0" max="100" step="1" value="${alphaValue}" aria-label="Opacity for ${escapeHtml(setting.label)}">
            <output data-role="alpha-value" data-key="${setting.key}">${alphaValue}%</output>
          </div>
        </div>
      `;
    }

    if (setting.type === "fontWeight") {
      return `
        <select data-role="select" data-key="${setting.key}" aria-label="${escapeHtml(setting.label)}">
          <option value="">Theme</option>
          <option value="300">300</option>
          <option value="400">400</option>
          <option value="500">500</option>
          <option value="600">600</option>
          <option value="700">700</option>
          <option value="800">800</option>
        </select>
      `;
    }

    return `
      <input data-role="value" data-key="${setting.key}" type="text" value="${escapeHtml(value)}" placeholder="${placeholder}" spellcheck="false">
    `;
  }

  _renderRows() {
    const group = SETTING_GROUPS.find((item) => item.id === this._activeGroup);
    return group.settings
      .map(
        (setting) => `
        <div class="setting-row ${this._focusedKey === setting.key ? "focused" : ""}" data-row="${setting.key}">
          <div class="setting-label">
            <label>${escapeHtml(setting.label)}</label>
            <span>${escapeHtml(setting.key)}</span>
          </div>
          <div class="setting-control">
            ${this._renderField(setting)}
            <button class="icon-button" data-action="reset-one" data-key="${setting.key}" title="Reset" aria-label="Reset ${escapeHtml(setting.label)}">
              <ha-icon icon="mdi:backup-restore"></ha-icon>
            </button>
          </div>
          <div class="row-error" aria-live="polite"></div>
        </div>
      `
      )
      .join("");
  }

  _renderNav() {
    return SETTING_GROUPS.map(
      (group) => `
        <button class="nav-button ${group.id === this._activeGroup ? "active" : ""}" data-group="${group.id}">
          <ha-icon icon="${group.icon}"></ha-icon>
          <span>${escapeHtml(group.title)}</span>
        </button>
      `
    ).join("");
  }

  _previewAttrs(group, key, label, extraClass = "") {
    const active = this._focusedKey === key || (!this._focusedKey && this._activeGroup === group);
    return `type="button" class="preview-hotspot ${extraClass} ${active ? "active" : ""}" data-preview-group="${group}" data-preview-key="${key}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}"`;
  }

  _scopeClass() {
    const scope = this._draft.target_device;
    if (scope === "mobile") {
      return "scope-mobile";
    }
    if (scope === "desktop") {
      return "scope-desktop";
    }
    return "scope-both";
  }

  _renderPreview() {
    return `
      <div class="preview-frame ${this._scopeClass()}">
        <button ${this._previewAttrs("header", "header_background", "Header background", "preview-toolbar")}>
          <ha-icon icon="mdi:menu"></ha-icon>
          <span>Home</span>
          <ha-icon icon="mdi:dots-vertical"></ha-icon>
        </button>
        <div class="preview-grid">
          <button ${this._previewAttrs("sidebar", "sidebar_background", "Sidebar background", "preview-sidebar")}>
            <span class="preview-sidebar-title">Home Assistant</span>
            <span class="preview-menu-item selected preview-hotspot" data-preview-group="sidebar" data-preview-key="sidebar_selected_color" title="Selected sidebar item" aria-label="Selected sidebar item">
              <ha-icon icon="mdi:view-dashboard"></ha-icon>
              <span>Overview</span>
            </span>
            <span class="preview-menu-item preview-hotspot" data-preview-group="sidebar" data-preview-key="sidebar_icon_color" title="Sidebar icons" aria-label="Sidebar icons">
              <ha-icon icon="mdi:cog"></ha-icon>
              <span>Settings</span>
              <span class="preview-badge preview-hotspot" data-preview-group="badges" data-preview-key="sidebar_badge_background" title="Sidebar badge" aria-label="Sidebar badge">3</span>
            </span>
            <span class="preview-menu-item preview-hotspot" data-preview-group="sidebar" data-preview-key="sidebar_text_color" title="Sidebar text" aria-label="Sidebar text">
              <ha-icon icon="mdi:bell"></ha-icon>
              <span>Notifications</span>
              <span class="preview-badge preview-hotspot" data-preview-group="badges" data-preview-key="sidebar_badge_background" title="Sidebar badge" aria-label="Sidebar badge">8</span>
            </span>
          </button>
          <button ${this._previewAttrs("general", "primary_background_color", "Page background", "preview-content")}>
            <span class="preview-view-tabs">
              <span class="preview-tab active preview-hotspot" data-preview-group="general" data-preview-key="accent_color" title="Accent color" aria-label="Accent color">Home</span>
              <span class="preview-tab">Energy</span>
              <span class="preview-tab">Security</span>
            </span>
            <span class="preview-dashboard-grid">
              <span class="preview-room">
                <span class="preview-room-title">Living room</span>
                <span class="preview-card-row">
                  <span class="preview-card climate preview-hotspot" data-preview-group="cards" data-preview-key="card_background" title="Card background" aria-label="Card background">
                    <span class="preview-card-title">
                      <ha-icon class="preview-hotspot" icon="mdi:home-thermometer" data-preview-group="cards" data-preview-key="card_icon_color" title="Card icons" aria-label="Card icons"></ha-icon>
                      <span>Climate</span>
                    </span>
                    <strong>21.4 °C</strong>
                    <small>Humidity 45 %</small>
                  </span>
                  <span class="preview-card mushroom preview-hotspot" data-preview-group="mushroom" data-preview-key="mushroom_card_radius" title="Mushroom card" aria-label="Mushroom card">
                    <span class="mushroom-shape preview-hotspot" data-preview-group="mushroom" data-preview-key="mushroom_shape_color" title="Mushroom shape" aria-label="Mushroom shape">
                      <ha-icon icon="mdi:lightbulb-on"></ha-icon>
                    </span>
                    <span>
                      <strong>Light</strong>
                      <small>On</small>
                    </span>
                  </span>
                </span>
              </span>
              <span class="preview-room compact">
                <span class="preview-room-title">Kitchen</span>
                <span class="preview-card-row">
                  <span class="preview-card sensor preview-hotspot" data-preview-group="cards" data-preview-key="card_text_color" title="Card text" aria-label="Card text">
                    <span class="preview-card-title">
                      <ha-icon icon="mdi:water-percent"></ha-icon>
                      <span>Humidity</span>
                    </span>
                    <strong>42 %</strong>
                  </span>
                  <span class="preview-card sensor preview-hotspot" data-preview-group="cards" data-preview-key="card_border" title="Card border" aria-label="Card border">
                    <span class="preview-card-title">
                      <ha-icon icon="mdi:power-plug"></ha-icon>
                      <span>Energy</span>
                    </span>
                    <strong>1.2 kW</strong>
                  </span>
                </span>
              </span>
            </span>
          </button>
        </div>
      </div>
    `;
  }

  _activateSetting(group, key) {
    if (!group) {
      return;
    }

    this._activeGroup = group;
    this._focusedKey = key ?? "";
    this._render();

    window.requestAnimationFrame(() => {
      const row = this.shadowRoot.querySelector(`[data-row="${this._focusedKey}"]`);
      row?.scrollIntoView({ block: "center", behavior: "smooth" });
      row
        ?.querySelector("[data-role='value'], [data-role='select']")
        ?.focus({ preventScroll: true });
    });
  }

  _queryDeep(selector, root = document, matches = []) {
    if (!root.querySelectorAll) {
      return matches;
    }

    matches.push(...root.querySelectorAll(selector));
    for (const element of root.querySelectorAll("*")) {
      if (element.shadowRoot) {
        this._queryDeep(selector, element.shadowRoot, matches);
      }
    }

    return matches;
  }

  _openHomeAssistantMenu() {
    const event = new CustomEvent("hass-toggle-menu", {
      bubbles: true,
      composed: true,
    });

    this.dispatchEvent(event);
    document.dispatchEvent(new CustomEvent("hass-toggle-menu"));
    window.dispatchEvent(new CustomEvent("hass-toggle-menu"));

    for (const drawer of this._queryDeep("ha-drawer, app-drawer, mwc-drawer")) {
      if ("open" in drawer) {
        drawer.open = true;
      }
      if ("opened" in drawer) {
        drawer.opened = true;
      }
      drawer.setAttribute("open", "");
    }
  }

  _updatePreviewFocus() {
    for (const element of this.shadowRoot.querySelectorAll("[data-preview-group]")) {
      const broadHotspot =
        element.classList.contains("preview-toolbar") ||
        element.classList.contains("preview-sidebar") ||
        element.classList.contains("preview-content");
      const active = this._focusedKey
        ? element.dataset.previewKey === this._focusedKey
        : broadHotspot && element.dataset.previewGroup === this._activeGroup;
      element.classList.toggle("active", active);
    }
  }

  _updatePreviewScope() {
    const frame = this.shadowRoot.querySelector(".preview-frame");
    if (!frame) {
      return;
    }

    frame.classList.toggle("scope-mobile", this._draft.target_device === "mobile");
    frame.classList.toggle("scope-desktop", this._draft.target_device === "desktop");
    frame.classList.toggle("scope-both", !this._draft.target_device);
  }

  _render() {
    const group = SETTING_GROUPS.find((item) => item.id === this._activeGroup);
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          min-height: 100%;
          color: var(--primary-text-color);
          background: var(--primary-background-color);
          box-sizing: border-box;
          font-family: var(--paper-font-body1_-_font-family, Roboto, Arial, sans-serif);
        }

        * {
          box-sizing: border-box;
        }

        .shell {
          min-height: 100%;
          padding: 24px;
          display: grid;
          gap: 20px;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          min-width: 0;
        }

        .title {
          min-width: 0;
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .menu-button {
          display: none;
        }

        h1 {
          margin: 0;
          min-width: 0;
          font-size: 24px;
          line-height: 1.2;
          font-weight: 500;
          letter-spacing: 0;
        }

        .meta {
          margin-top: 8px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          color: var(--secondary-text-color);
          font-size: 13px;
        }

        .pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 28px;
          padding: 0 10px;
          border-radius: 999px;
          background: var(--secondary-background-color);
          color: var(--primary-text-color);
          border: 1px solid var(--divider-color);
          max-width: 100%;
        }

        .pill span {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        button,
        select,
        input {
          font: inherit;
        }

        button {
          border: 0;
          cursor: pointer;
        }

        button:disabled {
          cursor: default;
          opacity: 0.55;
        }

        .action-button,
        .nav-button,
        .icon-button {
          min-height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 8px;
          color: var(--primary-text-color);
          background: var(--secondary-background-color);
          border: 1px solid var(--divider-color);
        }

        .action-button {
          padding: 0 14px;
        }

        .action-button.primary {
          color: var(--text-primary-color, #fff);
          background: var(--primary-color);
          border-color: var(--primary-color);
        }

        .icon-button {
          width: 40px;
          flex: 0 0 40px;
        }

        .layout {
          display: grid;
          grid-template-columns: minmax(180px, 230px) minmax(340px, 1fr) minmax(280px, 380px);
          gap: 20px;
          align-items: start;
        }

        .nav,
        .editor,
        .preview {
          min-width: 0;
          border: 1px solid var(--divider-color);
          background: var(--card-background-color);
          border-radius: 8px;
        }

        .nav {
          display: grid;
          gap: 4px;
          padding: 8px;
          position: sticky;
          top: 16px;
        }

        .nav-button {
          justify-content: flex-start;
          width: 100%;
          padding: 0 10px;
          background: transparent;
          border-color: transparent;
        }

        .nav-button.active {
          background: color-mix(in srgb, var(--primary-color) 14%, transparent);
          color: var(--primary-color);
        }

        .nav-button span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .editor-head,
        .preview-head {
          min-height: 56px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 0 16px;
          border-bottom: 1px solid var(--divider-color);
        }

        h2 {
          margin: 0;
          font-size: 18px;
          line-height: 1.3;
          font-weight: 500;
          letter-spacing: 0;
        }

        .dirty-label {
          color: var(--secondary-text-color);
          font-size: 13px;
        }

        .dirty-label[data-dirty="true"] {
          color: var(--primary-color);
        }

        .rows {
          display: grid;
        }

        .setting-row {
          display: grid;
          grid-template-columns: minmax(150px, 240px) minmax(220px, 1fr);
          gap: 12px;
          align-items: center;
          padding: 14px 16px;
          border-bottom: 1px solid var(--divider-color);
        }

        .setting-row.focused {
          background: color-mix(in srgb, var(--primary-color) 10%, transparent);
          box-shadow: inset 3px 0 0 var(--primary-color);
        }

        .setting-row:last-child {
          border-bottom: 0;
        }

        .setting-label {
          min-width: 0;
        }

        .setting-label label {
          display: block;
          font-size: 14px;
          line-height: 1.3;
          font-weight: 500;
        }

        .setting-label span {
          display: block;
          margin-top: 4px;
          color: var(--secondary-text-color);
          font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
          font-size: 12px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .setting-control {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .color-control {
          display: grid;
          flex: 1;
          gap: 8px;
          min-width: 0;
        }

        .field {
          display: flex;
          min-width: 0;
          flex: 1;
          gap: 8px;
        }

        .alpha-field {
          display: grid;
          grid-template-columns: 24px minmax(120px, 1fr) 46px;
          align-items: center;
          gap: 8px;
          min-width: 0;
          color: var(--secondary-text-color);
        }

        .alpha-field ha-icon {
          color: var(--secondary-text-color);
        }

        input[type="range"] {
          width: 100%;
          min-width: 0;
          accent-color: var(--primary-color);
        }

        output {
          text-align: right;
          font-size: 12px;
          color: var(--secondary-text-color);
        }

        input[type="color"] {
          width: 44px;
          min-width: 44px;
          height: 40px;
          padding: 2px;
          background: var(--secondary-background-color);
          border: 1px solid var(--divider-color);
          border-radius: 8px;
        }

        input[type="text"],
        select {
          width: 100%;
          min-width: 0;
          height: 40px;
          padding: 0 10px;
          color: var(--primary-text-color);
          background: var(--secondary-background-color);
          border: 1px solid var(--divider-color);
          border-radius: 8px;
          outline: none;
        }

        input[type="text"]:focus,
        input[type="range"]:focus,
        select:focus {
          border-color: var(--primary-color);
          box-shadow: 0 0 0 1px var(--primary-color);
        }

        .row-error {
          grid-column: 2;
          min-height: 0;
          color: var(--error-color, #db4437);
          font-size: 12px;
        }

        .setting-row.invalid input,
        .setting-row.invalid select {
          border-color: var(--error-color, #db4437);
        }

        .preview {
          overflow: hidden;
          position: sticky;
          top: 16px;
        }

        .preview-body {
          padding: 14px;
        }

        .preview-frame {
          overflow: hidden;
          border: 1px solid var(--divider-color);
          border-radius: 8px;
          background: var(--primary-background-color);
        }

        .preview-frame.scope-mobile {
          max-width: 310px;
          margin: 0 auto;
          border-radius: 24px;
          box-shadow: var(--ha-card-box-shadow, 0 12px 32px rgba(0, 0, 0, 0.24));
        }

        .preview-hotspot {
          position: relative;
          cursor: pointer;
          transition:
            outline-color 140ms ease,
            box-shadow 140ms ease,
            transform 140ms ease;
        }

        button.preview-hotspot {
          width: 100%;
          color: inherit;
          text-align: left;
          background: transparent;
          border: 0;
        }

        .preview-hotspot:hover,
        .preview-hotspot:focus-visible {
          outline: 2px solid color-mix(in srgb, var(--primary-color) 70%, transparent);
          outline-offset: -2px;
        }

        .preview-hotspot.active {
          outline: 2px solid var(--primary-color);
          outline-offset: -2px;
          box-shadow: inset 0 0 0 1px var(--primary-color);
          z-index: 1;
        }

        .preview-toolbar {
          height: 48px;
          display: grid;
          grid-template-columns: 32px 1fr 32px;
          align-items: center;
          gap: 8px;
          padding: 0 12px;
          background: var(--ha-theme-tweaker-header-background, var(--app-header-background-color, var(--primary-color)));
          color: var(--ha-theme-tweaker-header-text-color, var(--text-primary-color, #fff));
        }

        .preview-grid {
          display: grid;
          grid-template-columns: 150px minmax(0, 1fr);
          min-height: 320px;
        }

        .preview-sidebar {
          display: grid;
          align-content: start;
          gap: 6px;
          padding: 12px 8px;
          background: var(--ha-theme-tweaker-sidebar-background, var(--sidebar-background-color, var(--card-background-color)));
          color: var(--ha-theme-tweaker-sidebar-text-color, var(--sidebar-text-color, var(--primary-text-color)));
          border-right: 1px solid var(--divider-color);
        }

        .preview-sidebar-title {
          min-height: 28px;
          padding: 0 8px;
          display: flex;
          align-items: center;
          font-size: 13px;
          font-weight: 600;
        }

        .preview-menu-item {
          min-height: 38px;
          display: grid;
          grid-template-columns: 24px minmax(0, 1fr) auto;
          align-items: center;
          gap: 8px;
          padding: 0 8px;
          border-radius: 8px;
          color: var(--ha-theme-tweaker-sidebar-text-color, var(--sidebar-text-color, var(--primary-text-color)));
        }

        .preview-menu-item ha-icon {
          color: var(--ha-theme-tweaker-sidebar-icon-color, var(--sidebar-icon-color, currentColor));
        }

        .preview-menu-item.selected {
          color: var(--ha-theme-tweaker-sidebar-selected-color, var(--sidebar-selected-icon-color, var(--primary-color)));
          background: color-mix(in srgb, var(--ha-theme-tweaker-sidebar-selected-color, var(--primary-color)) 16%, transparent);
        }

        .preview-menu-item span:nth-child(2) {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .preview-badge {
          min-width: var(--ha-theme-tweaker-sidebar-badge-min-width, 18px);
          height: var(--ha-theme-tweaker-sidebar-badge-height, 18px);
          padding: 0 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--ha-theme-tweaker-sidebar-badge-text, var(--text-accent-color, #fff));
          background: var(--ha-theme-tweaker-sidebar-badge-background, var(--accent-color));
          border: 1px solid var(--ha-theme-tweaker-sidebar-badge-border-color, transparent);
          border-radius: var(--ha-theme-tweaker-sidebar-badge-radius, 999px);
          font-size: var(--ha-theme-tweaker-sidebar-badge-font-size, 11px);
          font-weight: var(--ha-theme-tweaker-sidebar-badge-font-weight, 500);
          line-height: 1;
        }

        .preview-content {
          padding: 12px;
          display: grid;
          gap: 12px;
          align-content: start;
          background: var(--primary-background-color);
        }

        .preview-view-tabs {
          display: flex;
          gap: 8px;
          overflow: hidden;
        }

        .preview-tab {
          min-height: 30px;
          padding: 0 10px;
          display: inline-flex;
          align-items: center;
          color: var(--secondary-text-color);
          border-radius: 8px;
          white-space: nowrap;
        }

        .preview-tab.active {
          color: var(--text-accent-color, var(--text-primary-color, #fff));
          background: var(--accent-color);
        }

        .preview-dashboard-grid,
        .preview-room,
        .preview-card-row {
          display: grid;
          gap: 12px;
          min-width: 0;
        }

        .preview-room-title {
          color: var(--primary-text-color);
          font-size: 15px;
          font-weight: 600;
        }

        .preview-card-row {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .preview-card {
          min-height: 104px;
          padding: 14px;
          display: grid;
          gap: 8px;
          background: var(--ha-theme-tweaker-card-background, var(--ha-card-background, var(--card-background-color)));
          color: var(--ha-theme-tweaker-card-text-color, var(--primary-text-color));
          border: var(--ha-theme-tweaker-card-border, 1px solid var(--divider-color));
          border-radius: var(--ha-theme-tweaker-card-radius, var(--ha-card-border-radius, 8px));
          box-shadow: var(--ha-theme-tweaker-card-shadow, var(--ha-card-box-shadow, none));
        }

        .preview-card-title {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .preview-card ha-icon {
          color: var(--ha-theme-tweaker-card-icon-color, var(--state-icon-color, var(--primary-color)));
        }

        .preview-card strong {
          font-size: 22px;
          font-weight: 500;
        }

        .preview-card small {
          display: block;
          color: var(--secondary-text-color);
        }

        .preview-card.sensor {
          min-height: 86px;
        }

        .preview-card.mushroom {
          grid-template-columns: 48px 1fr;
          align-items: center;
          min-height: 78px;
          border-radius: var(--ha-theme-tweaker-mushroom-card-radius, var(--ha-theme-tweaker-card-radius, var(--ha-card-border-radius, 8px)));
        }

        .mushroom-shape {
          width: 42px;
          height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: var(--ha-theme-tweaker-mushroom-shape-color, color-mix(in srgb, var(--primary-color) 18%, transparent));
        }

        .mushroom-shape ha-icon {
          color: var(--ha-theme-tweaker-mushroom-icon-color, var(--primary-color));
        }

        .preview-frame.scope-mobile .preview-grid {
          grid-template-columns: 1fr;
          min-height: 420px;
        }

        .preview-frame.scope-mobile .preview-sidebar {
          display: none;
        }

        .preview-frame.scope-mobile .preview-content {
          min-height: 420px;
        }

        .preview-frame.scope-mobile .preview-card-row {
          grid-template-columns: 1fr;
        }

        .status {
          min-height: 20px;
          color: var(--secondary-text-color);
          font-size: 13px;
        }

        .status[data-kind="success"] {
          color: var(--success-color, #0b8043);
        }

        .status[data-kind="error"] {
          color: var(--error-color, #db4437);
        }

        @media (max-width: 1100px) {
          .layout {
            grid-template-columns: 190px minmax(320px, 1fr);
          }

          .preview {
            grid-column: 2;
            position: static;
          }
        }

        @media (max-width: 760px) {
          .shell {
            padding: 12px;
          }

          .menu-button {
            display: inline-flex;
          }

          .topbar,
          .actions {
            align-items: stretch;
            justify-content: stretch;
          }

          .topbar {
            display: grid;
          }

          .actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .layout {
            grid-template-columns: 1fr;
          }

          .nav {
            position: static;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .preview {
            grid-column: auto;
          }

          .setting-row {
            grid-template-columns: 1fr;
            gap: 8px;
          }

          .setting-control {
            align-items: stretch;
          }

          .field,
          .setting-control {
            min-width: 0;
          }

          .alpha-field {
            grid-template-columns: 24px minmax(80px, 1fr) 42px;
          }

          .row-error {
            grid-column: 1;
          }

          .preview-grid {
            grid-template-columns: 1fr;
          }

          .preview-sidebar {
            border-right: 0;
            border-bottom: 1px solid var(--divider-color);
          }
        }
      </style>

      <div class="shell">
        <div class="topbar">
          <div class="title">
            <div class="title-row">
              <button class="icon-button menu-button" data-action="open-menu" title="Open menu" aria-label="Open Home Assistant menu">
                <ha-icon icon="mdi:menu"></ha-icon>
              </button>
              <h1>HA Theme Tweaker</h1>
            </div>
            <div class="meta">
              <span class="pill">
                <ha-icon icon="mdi:theme-light-dark"></ha-icon>
                <span class="theme-name">${escapeHtml(this._themeName)}</span>
              </span>
              <span class="dirty-label" data-dirty="${this._isDirty() ? "true" : "false"}">${this._isDirty() ? "Modified" : "Up to date"}</span>
              <span class="status" data-kind="${this._statusKind}">${escapeHtml(this._status)}</span>
            </div>
          </div>
          <div class="actions">
            <button class="action-button" data-action="reset-all">
              <ha-icon icon="mdi:restore"></ha-icon>
              <span>Reset all</span>
            </button>
            <button class="action-button primary" data-action="save" ${this._isDirty() ? "" : "disabled"}>
              <ha-icon icon="mdi:content-save"></ha-icon>
              <span>Save</span>
            </button>
          </div>
        </div>

        <div class="layout">
          <nav class="nav" aria-label="Categories">
            ${this._renderNav()}
          </nav>

          <section class="editor">
            <div class="editor-head">
              <h2>${escapeHtml(group.title)}</h2>
              <span class="status" data-kind="${this._statusKind}">${escapeHtml(this._status)}</span>
            </div>
            <div class="rows">
              ${this._renderRows()}
            </div>
          </section>

          <aside class="preview">
            <div class="preview-head">
              <h2>Preview</h2>
              <ha-icon icon="mdi:eye-outline"></ha-icon>
            </div>
            <div class="preview-body">
              ${this._renderPreview()}
            </div>
          </aside>
        </div>
      </div>
    `;
    this._attachEvents();
    this._syncControls();
    this._updatePreviewFocus();
  }

  _attachEvents() {
    for (const button of this.shadowRoot.querySelectorAll("[data-group]")) {
      button.addEventListener("click", () => {
        this._activeGroup = button.dataset.group;
        this._focusedKey = "";
        this._render();
      });
    }

    for (const input of this.shadowRoot.querySelectorAll("[data-role='value']")) {
      input.addEventListener("input", () => {
        const key = input.dataset.key;
        const color = this.shadowRoot.querySelector(
          `[data-role='color'][data-key="${key}"]`
        );
        const alpha = this.shadowRoot.querySelector(
          `[data-role='alpha'][data-key="${key}"]`
        );
        const alphaValue = this.shadowRoot.querySelector(
          `[data-role='alpha-value'][data-key="${key}"]`
        );
        if (color) {
          color.value = colorToHex(input.value);
        }
        if (alpha) {
          alpha.value = String(colorToAlpha(input.value));
        }
        if (alphaValue) {
          alphaValue.textContent = `${colorToAlpha(input.value)}%`;
        }
        this._setDraftValue(key, input.value);
      });
    }

    for (const input of this.shadowRoot.querySelectorAll("[data-role='color']")) {
      input.addEventListener("input", () => {
        const key = input.dataset.key;
        const text = this.shadowRoot.querySelector(
          `[data-role='value'][data-key="${key}"]`
        );
        const alpha = this.shadowRoot.querySelector(
          `[data-role='alpha'][data-key="${key}"]`
        );
        const alphaPercent = alpha?.value ?? "100";
        const value = colorWithAlpha(input.value, alphaPercent);
        if (text) {
          text.value = value;
        }
        this._setDraftValue(key, value);
      });
    }

    for (const input of this.shadowRoot.querySelectorAll("[data-role='alpha']")) {
      input.addEventListener("input", () => {
        const key = input.dataset.key;
        const text = this.shadowRoot.querySelector(
          `[data-role='value'][data-key="${key}"]`
        );
        const color = this.shadowRoot.querySelector(
          `[data-role='color'][data-key="${key}"]`
        );
        const alphaValue = this.shadowRoot.querySelector(
          `[data-role='alpha-value'][data-key="${key}"]`
        );
        const baseValue = text?.value || color?.value || this._draft[key];
        const value = colorWithAlpha(baseValue, input.value);
        if (text) {
          text.value = value;
        }
        if (color) {
          color.value = colorToHex(value);
        }
        if (alphaValue) {
          alphaValue.textContent = `${input.value}%`;
        }
        this._setDraftValue(key, value);
      });
    }

    for (const select of this.shadowRoot.querySelectorAll("[data-role='select']")) {
      select.addEventListener("change", () => {
        this._setDraftValue(select.dataset.key, select.value);
      });
    }

    for (const button of this.shadowRoot.querySelectorAll(
      "[data-action='reset-one']"
    )) {
      button.addEventListener("click", () => this._resetOne(button.dataset.key));
    }

    this.shadowRoot
      .querySelector("[data-action='save']")
      ?.addEventListener("click", () => this._save());
    this.shadowRoot
      .querySelector("[data-action='reset-all']")
      ?.addEventListener("click", () => this._resetAll());
    this.shadowRoot
      .querySelector("[data-action='open-menu']")
      ?.addEventListener("click", () => this._openHomeAssistantMenu());

    for (const element of this.shadowRoot.querySelectorAll("[data-preview-group]")) {
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        this._activateSetting(element.dataset.previewGroup, element.dataset.previewKey);
      });
    }
  }
}

customElements.define("ha-theme-tweaker-panel", HaThemeTweakerPanel);
