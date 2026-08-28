import {
  DEFAULT_SETTINGS,
  normalizeSettingValue,
  sanitizeCssValue,
} from "../styles.js";

const HEX_3 = /^#([0-9a-f]{3})$/i;
const HEX_6 = /^#([0-9a-f]{6})$/i;
const RGB =
  /^rgba?\(\s*(\d{1,3})(?:\s*,\s*|\s+)(\d{1,3})(?:\s*,\s*|\s+)(\d{1,3})(?:(?:\s*,\s*|\s*\/\s*)([\d.]+%?))?\s*\)$/i;

function clamp(number, min, max) {
  const value = Number(number);
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : min;
}

function hexPart(number) {
  return clamp(Number(number), 0, 255).toString(16).padStart(2, "0");
}

function parseAlpha(value) {
  if (!value) {
    return 1;
  }
  if (value.endsWith("%")) {
    return clamp(Number(value.slice(0, -1)) / 100, 0, 1);
  }
  return clamp(Number(value), 0, 1);
}

function formatAlpha(value) {
  return String(Number(clamp(value, 0, 1).toFixed(2)));
}

function parseColor(value) {
  const normalized = sanitizeCssValue(value);
  if (!normalized) {
    return null;
  }

  const short = normalized.match(HEX_3);
  if (short) {
    const [r, g, b] = short[1]
      .split("")
      .map((char) => parseInt(`${char}${char}`, 16));
    return { r, g, b, a: 1 };
  }

  const long = normalized.match(HEX_6);
  if (long) {
    const hex = long[1];
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 1,
    };
  }

  const rgb = normalized.match(RGB);
  if (rgb) {
    const [, r, g, b, a] = rgb;
    return {
      r: clamp(Number(r), 0, 255),
      g: clamp(Number(g), 0, 255),
      b: clamp(Number(b), 0, 255),
      a: parseAlpha(a),
    };
  }

  return null;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function colorToHex(value) {
  const parsed = parseColor(value);
  return parsed
    ? `#${hexPart(parsed.r)}${hexPart(parsed.g)}${hexPart(parsed.b)}`
    : "#03a9f4";
}

export function colorToAlpha(value) {
  const parsed = parseColor(value);
  return parsed ? Math.round(clamp(parsed.a, 0, 1) * 100) : 100;
}

export function colorWithAlpha(value, alphaPercent) {
  const parsed = parseColor(value) ?? parseColor(colorToHex(value));
  const alpha = clamp(Number(alphaPercent), 0, 100) / 100;
  if (!parsed) {
    return alpha >= 1 ? "#03a9f4" : `rgba(3, 169, 244, ${formatAlpha(alpha)})`;
  }
  if (alpha >= 1) {
    return `#${hexPart(parsed.r)}${hexPart(parsed.g)}${hexPart(parsed.b)}`;
  }
  return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${formatAlpha(alpha)})`;
}

export function normalizedInputValue(value) {
  return sanitizeCssValue(value) ?? "";
}

export function cloneSettings(settings = {}) {
  return Object.fromEntries(
    Object.keys(DEFAULT_SETTINGS).map((key) => [
      key,
      normalizeSettingValue(key, settings[key]),
    ])
  );
}

export function settingsChanged(left = {}, right = {}) {
  return Object.keys(DEFAULT_SETTINGS).some(
    (key) =>
      normalizeSettingValue(key, left[key]) !== normalizeSettingValue(key, right[key])
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
