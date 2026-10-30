// Recharts clones this element and injects `active` and `payload`.
// `rows` describe what to show: { label, color, shape?, value(datum) }; `color` may be a function of the datum.
export default function ChartTooltip({ active, payload, title, rows }) {
  if (!active || !payload?.length) return null;
  const datum = payload[0].payload;

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-title">{title(datum)}</p>
      <dl>
        {rows.map((row) => {
          const value = row.value(datum);
          if (value == null) return null;
          const color = typeof row.color === "function" ? row.color(datum) : row.color;
          return (
            <div className="chart-tooltip-row" key={row.label}>
              <dt>
                <span className={`swatch swatch-${row.shape ?? "line"}`} style={{ "--swatch": color }} aria-hidden="true" />
                {row.label}
              </dt>
              <dd>{value}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
