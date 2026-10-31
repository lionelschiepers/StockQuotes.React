const FALLBACK_LOCALE = 'fr-FR';
const formatters = new Map();

export function getLocale() {
  return globalThis.navigator?.language || FALLBACK_LOCALE;
}

function getFormatter(options) {
  const locale = getLocale();
  const key = `${locale}|${JSON.stringify(options)}`;
  let formatter = formatters.get(key);
  if (formatter === undefined) {
    formatter = new Intl.NumberFormat(locale, options);
    formatters.set(key, formatter);
  }
  return formatter;
}

function isPresent(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

// Plain number, e.g. prices and share counts.
export function formatNumber(value, { min = 0, max = 2, signed = false } = {}) {
  if (!isPresent(value)) return '';
  return getFormatter({
    minimumFractionDigits: min,
    maximumFractionDigits: max,
    signDisplay: signed ? 'exceptZero' : 'auto'
  }).format(value);
}

// Whole euros, e.g. "312 400 €".
export function formatEur(value, { signed = false } = {}) {
  if (!isPresent(value)) return '';
  return getFormatter({
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
    signDisplay: signed ? 'exceptZero' : 'auto'
  }).format(value);
}

// Takes a ratio (0.0123 -> "1,23 %").
export function formatPercent(ratio, { digits = 2, signed = false } = {}) {
  if (!isPresent(ratio)) return '';
  return getFormatter({
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    signDisplay: signed ? 'exceptZero' : 'auto'
  }).format(ratio);
}

// Ink for gains and flat values, red ink for losses.
export function moneyTone(value) {
  return isPresent(value) && value < 0 ? 'text-loss' : 'text-ink';
}
