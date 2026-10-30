import { useCallback, useEffect, useState } from "react";
import { getAccuracy, getHorizons } from "../api/client.js";
import HorizonChart from "../charts/HorizonChart.jsx";
import HourOfDayChart from "../charts/HourOfDayChart.jsx";
import MonthTimelineChart from "../charts/MonthTimelineChart.jsx";
import ChartCard from "../components/ChartCard.jsx";
import MetricCard from "../components/MetricCard.jsx";
import StatusPanel from "../components/StatusPanel.jsx";
import { useApi } from "../hooks/useApi.js";
import { errorDirection, formatHourOfDay, formatMW, formatPercent } from "../utils/format.js";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const METHODS = [
  { id: "decision", label: "At decision time" },
  { id: "horizon", label: "Fixed horizon" },
];

const TIMELINE_LEGEND = [
  { label: "Forecast", color: "var(--forecast)", shape: "line" },
  { label: "Actual", color: "var(--actual)", shape: "area" },
];
const HOUR_LEGEND = [
  { label: "Bias above 0 · over-forecast", color: "var(--over)", shape: "bar" },
  { label: "Bias below 0 · under-forecast", color: "var(--under)", shape: "bar" },
  { label: "MAE", color: "var(--metric)", shape: "line" },
];
const HORIZON_LEGEND = [
  { label: "MAE", color: "var(--metric)", shape: "line" },
  { label: "P90 error", color: "var(--over)", shape: "dashed" },
];

function buildInsight({ bias_mw: bias, p90_error_mw: p90 }) {
  if (bias == null || p90 == null) return null;
  const average = `Forecasts were on average ${formatMW(Math.abs(bias))} too ${bias >= 0 ? "high" : "low"}`;
  if (p90 <= 0) return `${average}; in 9 of 10 hours the forecast did not exceed the actual.`;
  return `${average}; in 9 of 10 hours the over-forecast was below ${formatMW(p90)} — buying that much extra would have covered 90% of hours.`;
}

const describeMethod = (data) =>
  data.method === "horizon" ? `Forecasts ≥ ${data.horizon_hours} h ahead` : `Latest forecast at ${formatHourOfDay(data.decision_hour)} UTC on D-1`;

export default function AccuracyView() {
  const [method, setMethod] = useState("decision");
  const [hour, setHour] = useState(9);
  const [horizonInput, setHorizonInput] = useState(24);
  const [horizon, setHorizon] = useState(24);

  // Debounce the slider so dragging it doesn't fire a request per step.
  useEffect(() => {
    const timer = setTimeout(() => setHorizon(horizonInput), 250);
    return () => clearTimeout(timer);
  }, [horizonInput]);

  const loadAccuracy = useCallback(
    (signal) => getAccuracy(method === "horizon" ? { horizonHours: horizon } : { decisionHour: hour }, signal),
    [method, horizon, hour],
  );
  const accuracy = useApi(loadAccuracy);
  const horizons = useApi(getHorizons);

  const data = accuracy.data;
  const metrics = data?.metrics;
  const bias = errorDirection(metrics?.bias_mw);
  const insight = metrics && buildInsight(metrics);

  return (
    <div className="page">
      <div className="panel controls">
        <fieldset className="segmented">
          <legend>Evaluate forecasts</legend>
          <div className="segmented-options">
            {METHODS.map((option) => (
              <label key={option.id} className="segment">
                <input type="radio" name="method" value={option.id} checked={method === option.id} onChange={() => setMethod(option.id)} />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {method === "decision" ? (
          <div className="field">
            <label htmlFor="accuracy-hour">Decision time on D-1 (UTC)</label>
            <select id="accuracy-hour" value={hour} onChange={(event) => setHour(Number(event.target.value))}>
              {HOURS.map((value) => (
                <option key={value} value={value}>
                  {formatHourOfDay(value)}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="field field-slider">
            <label htmlFor="horizon">
              Hours ahead <output htmlFor="horizon" className="num">{horizonInput} h</output>
            </label>
            <input id="horizon" type="range" min={1} max={48} value={horizonInput} onChange={(event) => setHorizonInput(Number(event.target.value))} />
          </div>
        )}
      </div>

      {accuracy.error && <StatusPanel error={accuracy.error} onRetry={accuracy.retry} />}
      {!accuracy.error && !data && <StatusPanel cards={5} />}
      {!accuracy.error && data && (
        <div className={`page-content${accuracy.loading ? " is-refreshing" : ""}`} aria-busy={accuracy.loading}>
          <div className="metric-grid">
            <MetricCard label="Mean absolute error" value={formatMW(metrics.mae_mw, { unit: false })} unit="MW" tone="metric" detail={`${formatPercent(metrics.mae_pct_of_actual)} of actual`} />
            <MetricCard label="RMSE" value={formatMW(metrics.rmse_mw, { unit: false })} unit="MW" detail="Weights large misses more" />
            <MetricCard label="Bias" value={formatMW(metrics.bias_mw, { sign: true, unit: false })} unit="MW" tone={bias?.tone} detail={bias ? `${bias.label} · ${bias.consequence}` : "No data"} />
            <MetricCard
              label="P10 – P90 error"
              value={`${formatMW(metrics.p10_error_mw, { sign: true, unit: false })} … ${formatMW(metrics.p90_error_mw, { sign: true, unit: false })}`}
              unit="MW"
              tone="over"
              compact
              detail="80% of hourly errors fall here"
            />
            <MetricCard label="Hours evaluated" value={String(metrics.hours)} detail={describeMethod(data)} />
          </div>

          {insight && <p className="insight">{insight}</p>}

          <ChartCard title="January forecast vs actual" subtitle="Every evaluated hour, MW" legend={TIMELINE_LEGEND}>
            <MonthTimelineChart points={data.points} />
          </ChartCard>

          <div className="chart-grid">
            <ChartCard title="Error by hour of day" subtitle="Bias (forecast − actual) and MAE per delivery hour, MW" legend={HOUR_LEGEND}>
              <HourOfDayChart rows={data.by_hour_of_day} />
            </ChartCard>
            <ChartCard
              title="Accuracy vs horizon"
              subtitle={
                horizons.data
                  ? `Coverage drops at long horizons: ${horizons.data.at(-1).hours} hours at 48 h vs ${horizons.data[0].hours} at 1 h.`
                  : "How error grows with hours ahead"
              }
              legend={HORIZON_LEGEND}
            >
              {horizons.data ? (
                <HorizonChart rows={horizons.data} selectedHorizon={method === "horizon" ? horizon : null} />
              ) : (
                <StatusPanel error={horizons.error} onRetry={horizons.retry} />
              )}
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
}
