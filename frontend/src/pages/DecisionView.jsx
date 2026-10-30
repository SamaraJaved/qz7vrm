import { useCallback, useMemo, useState } from "react";
import { getAccuracy, getForecast } from "../api/client.js";
import DayForecastChart from "../charts/DayForecastChart.jsx";
import ChartCard from "../components/ChartCard.jsx";
import MetricCard from "../components/MetricCard.jsx";
import StatusPanel from "../components/StatusPanel.jsx";
import { useApi } from "../hooks/useApi.js";
import {
  errorDirection,
  formatDateTime,
  formatHourOfDay,
  formatHours,
  formatLongDate,
  formatMW,
  formatPercent,
  formatTimeUTC,
  hoursBetween,
  shiftDate,
} from "../utils/format.js";

const FIRST_DAY = "2026-01-02";
const LAST_DAY = "2026-02-01";
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

const LEGEND = [
  { label: "Forecast", color: "var(--forecast)", shape: "dashed" },
  { label: "Actual", color: "var(--actual)", shape: "line" },
  { label: "Likely actual range · 80% range based on January forecast errors", color: "var(--forecast)", shape: "band" },
];

const average = (values) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null);

function contextLine({ decision_time: decisionTime, forecast_published_at: publishedAt }) {
  const decision = `Decision at ${formatDateTime(decisionTime)} UTC`;
  if (!publishedAt) return `${decision} · no forecast had been published by then`;
  const lead = formatHours(hoursBetween(publishedAt, decisionTime));
  return `${decision} · using forecast published ${formatTimeUTC(publishedAt)} UTC (${lead} earlier)`;
}

export default function DecisionView() {
  const [date, setDate] = useState("2026-01-15");
  const [hour, setHour] = useState(9);

  const loadForecast = useCallback((signal) => getForecast(date, hour, signal), [date, hour]);
  const loadAccuracy = useCallback((signal) => getAccuracy({ decisionHour: hour }, signal), [hour]);
  const forecast = useApi(loadForecast);
  const accuracy = useApi(loadAccuracy);

  const points = forecast.data?.points;
  const averages = useMemo(
    () => ({
      forecast: average((points ?? []).map((point) => point.forecast_mw)),
      actual: average((points ?? []).map((point) => point.actual_mw)),
    }),
    [points],
  );

  const changeDate = (value) => {
    if (value >= FIRST_DAY && value <= LAST_DAY) setDate(value);
  };
  const retry = () => {
    if (forecast.error) forecast.retry();
    if (accuracy.error) accuracy.retry();
  };

  const error = forecast.error ?? accuracy.error;
  const metrics = forecast.data?.metrics;
  const bias = errorDirection(metrics?.bias_mw);
  const p90 = accuracy.data?.metrics.p90_error_mw;

  return (
    <div className="page">
      <div className="panel controls">
        <div className="field">
          <label htmlFor="delivery-date">Delivery day</label>
          <div className="date-stepper">
            <button type="button" className="icon-button" aria-label="Previous day" disabled={date <= FIRST_DAY} onClick={() => changeDate(shiftDate(date, -1))}>
              ‹
            </button>
            <input id="delivery-date" type="date" min={FIRST_DAY} max={LAST_DAY} value={date} onChange={(event) => changeDate(event.target.value)} />
            <button type="button" className="icon-button" aria-label="Next day" disabled={date >= LAST_DAY} onClick={() => changeDate(shiftDate(date, 1))}>
              ›
            </button>
          </div>
        </div>
        <div className="field">
          <label htmlFor="decision-hour">Decision time on D-1 (UTC)</label>
          <select id="decision-hour" value={hour} onChange={(event) => setHour(Number(event.target.value))}>
            {HOURS.map((value) => (
              <option key={value} value={value}>
                {formatHourOfDay(value)}
              </option>
            ))}
          </select>
        </div>
        {forecast.data && !error && <p className="context-line">{contextLine(forecast.data)}</p>}
      </div>

      {error && <StatusPanel error={error} onRetry={retry} />}
      {!error && !forecast.data && <StatusPanel cards={4} />}
      {!error && forecast.data && (
        <div className={`page-content${forecast.loading || accuracy.loading ? " is-refreshing" : ""}`} aria-busy={forecast.loading}>
          <div className="metric-grid">
            <MetricCard label="Avg forecast" value={formatMW(averages.forecast, { unit: false })} unit="MW" tone="forecast" detail={`${points.length} hourly values`} />
            <MetricCard label="Avg actual" value={formatMW(averages.actual, { unit: false })} unit="MW" tone="actual" detail="Metered wind output" />
            <MetricCard label="Mean absolute error" value={formatMW(metrics.mae_mw, { unit: false })} unit="MW" tone="metric" detail={`${formatPercent(metrics.mae_pct_of_actual)} of actual`} />
            <MetricCard
              label="Bias"
              value={formatMW(metrics.bias_mw, { sign: true, unit: false })}
              unit="MW"
              tone={bias?.tone}
              detail={bias ? `${bias.label} · ${bias.consequence}` : "No data"}
            />
          </div>

          <ChartCard
            title={`Wind forecast vs actual · ${formatLongDate(forecast.data.delivery_date)}`}
            subtitle="Hourly national wind generation in MW, UTC delivery hours"
            legend={LEGEND}
            tall
            footer={
              p90 != null && (
                <p>
                  <strong>Planning rule:</strong> in 9 of 10 January hours, actual wind was no more than{" "}
                  <span className="num">{formatMW(p90)}</span> below the forecast. The bottom of the band is a prudent
                  wind assumption when sizing the purchase.
                </p>
              )
            }
          >
            {points.length > 0 ? (
              <DayForecastChart points={points} p10={accuracy.data?.metrics.p10_error_mw} p90={p90} />
            ) : (
              <p className="chart-empty">No forecast was published before this decision time.</p>
            )}
          </ChartCard>
        </div>
      )}
    </div>
  );
}
