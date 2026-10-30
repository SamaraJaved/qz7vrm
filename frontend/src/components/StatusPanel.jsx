export default function StatusPanel({ error, onRetry, cards = 0 }) {
  if (error) {
    return (
      <div className="panel status-error" role="alert">
        <svg className="status-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 7v6M12 16.5v.5" />
        </svg>
        <div className="status-text">
          <p className="status-title">Couldn&rsquo;t load this data</p>
          <p className="status-message">{error.message}</p>
        </div>
        <button type="button" className="button" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="status-loading" role="status" aria-label="Loading data">
      {cards > 0 && (
        <div className="metric-grid">
          {Array.from({ length: cards }, (_, index) => (
            <div key={index} className="skeleton skeleton-card" />
          ))}
        </div>
      )}
      <div className="skeleton skeleton-chart" />
    </div>
  );
}
