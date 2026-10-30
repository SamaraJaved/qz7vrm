import { useMemo } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChartTooltip from "../components/ChartTooltip.jsx";
import { describeError, formatAxisMW, formatDateTime, formatMW, formatTimeUTC } from "../utils/format.js";

const TOOLTIP_ROWS = [
  { label: "Forecast", color: "var(--forecast)", shape: "dashed", value: (d) => formatMW(d.forecast) },
  { label: "Actual", color: "var(--actual)", value: (d) => formatMW(d.actual) },
  {
    label: "Likely range",
    color: "var(--forecast)",
    shape: "band",
    value: (d) => d.range && `${formatMW(d.range[0], { unit: false })} – ${formatMW(d.range[1])}`,
  },
  {
    label: "Error",
    color: (d) => (d.error > 0 ? "var(--over)" : "var(--under)"),
    shape: "bar",
    value: (d) => describeError(d.error),
  },
];

const tooltipTitle = (d) => `${formatDateTime(d.time)} UTC`;

export default function DayForecastChart({ points, p10, p90 }) {
  const data = useMemo(
    () =>
      points.map((point) => ({
        time: point.time,
        forecast: point.forecast_mw,
        actual: point.actual_mw,
        error: point.error_mw,
        // error = forecast − actual, so actual = forecast − error. January's P10/P90 errors
        // therefore give an 80% range for the actual of [forecast − P90, forecast − P10].
        // Wind output cannot be negative, so the band is floored at 0.
        range:
          p10 == null || p90 == null
            ? null
            : [Math.max(0, point.forecast_mw - p90), Math.max(0, point.forecast_mw - p10)],
      })),
    [points, p10, p90],
  );

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="likely-range-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--forecast)" stopOpacity={0.34} />
            <stop offset="100%" stopColor="var(--forecast)" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis dataKey="time" tickFormatter={formatTimeUTC} interval={3} axisLine={false} tickLine={false} tickMargin={10} />
        <YAxis tickFormatter={formatAxisMW} domain={[0, "auto"]} axisLine={false} tickLine={false} width={44} />
        <Tooltip
          content={<ChartTooltip title={tooltipTitle} rows={TOOLTIP_ROWS} />}
          cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey="range"
          stroke="var(--forecast)"
          strokeOpacity={0.4}
          strokeWidth={1}
          fill="url(#likely-range-fill)"
          activeDot={false}
        />
        <Line
          type="monotone"
          dataKey="actual"
          stroke="var(--actual)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0, fill: "var(--actual)" }}
        />
        <Line
          type="monotone"
          dataKey="forecast"
          stroke="var(--forecast)"
          strokeWidth={2.5}
          strokeDasharray="6 4"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0, fill: "var(--forecast)" }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
