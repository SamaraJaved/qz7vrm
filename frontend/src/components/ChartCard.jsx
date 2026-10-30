export default function ChartCard({ title, subtitle, legend = [], footer, tall = false, children }) {
  return (
    <section className="panel chart-card">
      <header className="chart-card-header">
        <h3>{title}</h3>
        {subtitle && <p className="chart-card-subtitle">{subtitle}</p>}
        {legend.length > 0 && (
          <ul className="legend">
            {legend.map((item) => (
              <li key={item.label}>
                <span className={`swatch swatch-${item.shape ?? "line"}`} style={{ "--swatch": item.color }} aria-hidden="true" />
                {item.label}
              </li>
            ))}
          </ul>
        )}
      </header>
      <div className={`chart-body${tall ? " is-tall" : ""}`}>{children}</div>
      {footer && <footer className="chart-card-footer">{footer}</footer>}
    </section>
  );
}
