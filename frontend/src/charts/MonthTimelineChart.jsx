import { useMemo } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChartTooltip from "../components/ChartTooltip.jsx";
import { describeError, formatAxisMW, formatDateTime, formatDayMonth, formatMW } from "../utils/format.js";

const TOOLTIP_ROWS = [
  { label: "Forecast", color: "var(--forecast)", value: (d) => formatMW(d.forecast) },
  { label: "Actual", color: "var(--actual)", shape: "area", value: (d) => formatMW(d.actual) },
  {
    label: "Error",
    color: (d) => (d.error > 0 ? "var(--over)" : "var(--under)"),
    shape: "bar",
    value: (d) => describeError(d.error),
  },
];

const tooltipTitle = (d) => `${formatDateTime(d.time)} UTC`;

export default function MonthTimelineChart({ points }) {
  const { data, ticks } = useMemo(() => {
    const rows = points.map((point) => ({
      time: point.time,
      forecast: point.forecast_mw,
      actual: point.actual_mw,
      error: point.error_mw,
    }));
    // One tick per week keeps the axis readable even on a phone.
    const weeklyTicks = rows
      .filter((row) => new Date(row.time).getUTCHours() === 0)
      .filter((_, index) => index % 7 === 0)
      .map((row) => row.time);
    return { data: rows, ticks: weeklyTicks };
  }, [points]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="month-actual-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--actual)" stopOpacity={0.16} />
            <stop offset="100%" stopColor="var(--actual)" stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis dataKey="time" ticks={ticks} tickFormatter={formatDayMonth} axisLine={false} tickLine={false} tickMargin={10} />
        <YAxis tickFormatter={formatAxisMW} domain={[0, "auto"]} axisLine={false} tickLine={false} width={44} />
        <Tooltip
          content={<ChartTooltip title={tooltipTitle} rows={TOOLTIP_ROWS} />}
          cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
        />
        <Area
          type="linear"
          dataKey="actual"
          stroke="var(--actual)"
          strokeOpacity={0.8}
          strokeWidth={1.25}
          fill="url(#month-actual-fill)"
          activeDot={{ r: 3, strokeWidth: 0, fill: "var(--actual)" }}
        />
        <Line
          type="linear"
          dataKey="forecast"
          stroke="var(--forecast)"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0, fill: "var(--forecast)" }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
