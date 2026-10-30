const plain = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0, signDisplay: "negative" });
const signed = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0, signDisplay: "exceptZero" });
const compact = new Intl.NumberFormat("en-GB", { notation: "compact", maximumFractionDigits: 1 });
const oneDecimal = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });

const dayMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const longDate = new Intl.DateTimeFormat("en-GB", {
  weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
});
const hourMinute = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "UTC",
});

const isMissing = (value) => value == null || Number.isNaN(value);

export function formatMW(value, { sign = false, unit = true } = {}) {
  if (isMissing(value)) return "—";
  const text = (sign ? signed : plain).format(value);
  return unit ? `${text} MW` : text;
}

export const formatAxisMW = (value) => compact.format(value);

export const formatPercent = (value) => (isMissing(value) ? "—" : `${oneDecimal.format(value)}%`);

export const formatHours = (hours) => `${oneDecimal.format(hours)} h`;

export const formatDayMonth = (iso) => dayMonth.format(new Date(iso));

export const formatTimeUTC = (iso) => hourMinute.format(new Date(iso));

export const formatDateTime = (iso) => `${formatDayMonth(iso)} ${formatTimeUTC(iso)}`;

export const formatLongDate = (isoDate) => longDate.format(new Date(`${isoDate}T00:00:00Z`));

export const formatHourOfDay = (hour) => `${String(hour).padStart(2, "0")}:00`;

export function shiftDate(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export const hoursBetween = (fromIso, toIso) => (Date.parse(toIso) - Date.parse(fromIso)) / 3_600_000;

// Positive error = forecast too high = the buyer is left short of power.
export function errorDirection(errorMw) {
  if (isMissing(errorMw)) return null;
  return errorMw > 0
    ? { tone: "over", label: "Over-forecast", consequence: "shortfall risk" }
    : { tone: "under", label: "Under-forecast", consequence: "surplus" };
}

export function describeError(errorMw) {
  const direction = errorDirection(errorMw);
  return direction ? `${formatMW(Math.abs(errorMw))} ${direction.label.toLowerCase()}` : "—";
}
