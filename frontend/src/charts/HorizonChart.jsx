import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChartTooltip from "../components/ChartTooltip.jsx";
import { describeError, formatAxisMW, formatMW } from "../utils/format.js";

const HORIZON_TICKS = [1, 12, 24, 36, 48];

const TOOLTIP_ROWS = [
  { label: "MAE", color: "var(--metric)", value: (d) => formatMW(d.mae_mw) },
  { label: "P90 error", color: "var(--over)", shape: "dashed", value: (d) => formatMW(d.p90_error_mw) },
  {
    label: "Bias",
    color: (d) => (d.bias_mw > 0 ? "var(--over)" : "var(--under)"),
    shape: "bar",
    value: (d) => describeError(d.bias_mw),
  },
  { label: "Coverage", color: "var(--text-faint)", shape: "bar", value: (d) => `${d.hours} hours` },
];

const tooltipTitle = (d) => `At least ${d.horizon_hours} h ahead`;

export default function HorizonChart({ rows, selectedHorizon }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows} margin={{ top: 20, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis
          dataKey="horizon_hours"
          type="number"
          domain={[1, 48]}
          ticks={HORIZON_TICKS}
          tickFormatter={(hours) => `${hours}h`}
          axisLine={false}
          tickLine={false}
          tickMargin={10}
        />
        <YAxis tickFormatter={formatAxisMW} domain={[0, "auto"]} axisLine={false} tickLine={false} width={44} />
        <Tooltip
          content={<ChartTooltip title={tooltipTitle} rows={TOOLTIP_ROWS} />}
          cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
        />
        {selectedHorizon != null && (
          <ReferenceLine
            x={selectedHorizon}
            stroke="var(--forecast)"
            strokeDasharray="3 3"
            label={{ value: `${selectedHorizon} h`, position: "top", className: "reference-label" }}
          />
        )}
        <Line
          type="monotone"
          dataKey="mae_mw"
          stroke="var(--metric)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0, fill: "var(--metric)" }}
        />
        <Line
          type="monotone"
          dataKey="p90_error_mw"
          stroke="var(--over)"
          strokeWidth={2}
          strokeDasharray="6 4"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0, fill: "var(--over)" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
