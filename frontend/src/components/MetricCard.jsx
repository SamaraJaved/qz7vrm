export default function MetricCard({ label, value, unit, detail, tone, compact = false }) {
  const toneClass = tone ? ` tone-${tone}` : "";
  return (
    <article className={`metric-card${toneClass}`}>
      <p className="metric-label">{label}</p>
      <p className={`metric-value${compact ? " is-compact" : ""}`}>
        {value}
        {unit && value !== "—" && <span className="metric-unit">{unit}</span>}
      </p>
      {detail && <p className="metric-detail">{detail}</p>}
    </article>
  );
}
