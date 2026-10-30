import { Bar, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChartTooltip from "../components/ChartTooltip.jsx";
import { describeError, formatAxisMW, formatHourOfDay, formatMW } from "../utils/format.js";

const biasColor = (bias) => (bias > 0 ? "var(--over)" : "var(--under)");

const TOOLTIP_ROWS = [
  { label: "Bias", color: (d) => biasColor(d.bias_mw), shape: "bar", value: (d) => describeError(d.bias_mw) },
  { label: "MAE", color: "var(--metric)", value: (d) => formatMW(d.mae_mw) },
];

const tooltipTitle = (d) => `Delivery hour ${formatHourOfDay(d.hour)} UTC`;

export default function HourOfDayChart({ rows }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis dataKey="hour" tickFormatter={formatHourOfDay} interval={3} axisLine={false} tickLine={false} tickMargin={10} />
        <YAxis tickFormatter={formatAxisMW} axisLine={false} tickLine={false} width={44} />
        <Tooltip content={<ChartTooltip title={tooltipTitle} rows={TOOLTIP_ROWS} />} cursor={{ fill: "var(--cursor-fill)" }} />
        <ReferenceLine y={0} stroke="var(--border-strong)" />
        <Bar dataKey="bias_mw" radius={2} maxBarSize={18}>
          {rows.map((row) => (
            <Cell key={row.hour} fill={biasColor(row.bias_mw)} fillOpacity={0.85} />
          ))}
        </Bar>
        <Line
          type="monotone"
          dataKey="mae_mw"
          stroke="var(--metric)"
          strokeWidth={2}
          dot={{ r: 2.5, strokeWidth: 0, fill: "var(--metric)" }}
          activeDot={{ r: 4, strokeWidth: 0, fill: "var(--metric)" }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
