import { DEFAULT_SETTINGS, sanitizeCssValue } from "../styles.js";

const HEX_3 = /^#([0-9a-f]{3})$/i;
const HEX_6 = /^#([0-9a-f]{6})$/i;
const RGB = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})(?:[\s,/.]+[\d.]+)?\s*\)$/i;

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function colorToHex(value) {
  const normalized = sanitizeCssValue(value);
  if (!normalized) {
    return "#03a9f4";
  }

  const short = normalized.match(HEX_3);
  if (short) {
    return `#${short[1]
      .split("")
      .map((char) => `${char}${char}`)
      .join("")}`.toLowerCase();
  }

  const long = normalized.match(HEX_6);
  if (long) {
    return normalized.toLowerCase();
  }

  const rgb = normalized.match(RGB);
  if (rgb) {
    const [, r, g, b] = rgb;
    return `#${[r, g, b]
      .map((part) =>
        Math.max(0, Math.min(255, Number(part))).toString(16).padStart(2, "0")
      )
      .join("")}`;
  }

  return "#03a9f4";
}

export function normalizedInputValue(value) {
  return sanitizeCssValue(value) ?? "";
}

export function cloneSettings(settings = {}) {
  return Object.fromEntries(
    Object.keys(DEFAULT_SETTINGS).map((key) => [
      key,
      sanitizeCssValue(settings[key]),
    ])
  );
}

export function settingsChanged(left = {}, right = {}) {
  return Object.keys(DEFAULT_SETTINGS).some(
    (key) => sanitizeCssValue(left[key]) !== sanitizeCssValue(right[key])
  );
}

export function extractSettings(payload) {
  return (
    payload?.settings ??
    payload?.result?.settings ??
    payload?.event?.settings ??
    payload?.event?.data?.settings ??
    null
  );
}
