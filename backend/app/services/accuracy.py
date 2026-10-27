"""
Accuracy: put forecasts next to actuals and measure the errors.
"""

import pandas as pd
from app.services.forecast_selection import forecasts_at_horizon
from app.config import DELIVERY_FROM, DELIVERY_TO


def match_with_actuals(
    selected_forecasts: pd.DataFrame,
    actuals: pd.DataFrame,
    date_from: str = DELIVERY_FROM,
    date_to: str = DELIVERY_TO,
) -> pd.DataFrame:
    """
    One row per hour: forecast_mw, actual_mw, error_mw.
    Only hours that exist in BOTH tables are kept.
    error_mw = forecast - actual  (positive = forecast was too high)
    """
    merged = selected_forecasts.merge(actuals, on="startTime", how="inner", suffixes=("_forecast", "_actual"))
    merged = merged.rename(columns={"generation_forecast": "forecast_mw", "generation_actual": "actual_mw"})

    start = pd.Timestamp(date_from, tz="UTC")
    end = pd.Timestamp(date_to, tz="UTC") + pd.Timedelta(days=1)
    merged = merged[(merged["startTime"] >= start) & (merged["startTime"] < end)]

    merged["error_mw"] = merged["forecast_mw"] - merged["actual_mw"]
    return merged.sort_values("startTime").reset_index(drop=True)

def compute_metrics(matched: pd.DataFrame) -> dict:
    """Summary numbers describing how wrong the forecasts were."""
    if matched.empty:
        return {"hours": 0}

    errors = matched["error_mw"]
    mae = errors.abs().mean()

    return {
        "hours": int(len(matched)),
        "mae_mw": round(float(mae), 1),
        "rmse_mw": round(float((errors**2).mean() ** 0.5), 1),
        "bias_mw": round(float(errors.mean()), 1),
        "mae_pct_of_actual": round(float(mae / matched["actual_mw"].mean() * 100), 1),
        "p10_error_mw": round(float(errors.quantile(0.10)), 1),
        "p90_error_mw": round(float(errors.quantile(0.90)), 1),
        "max_over_forecast_mw": round(float(errors.max()), 1),
        "max_under_forecast_mw": round(float(errors.min()), 1),
    }


def error_by_hour_of_day(matched: pd.DataFrame) -> pd.DataFrame:
    """Average error for each hour of the day (0-23)."""
    grouped = matched.groupby(matched["startTime"].dt.hour)["error_mw"]
    table = pd.DataFrame({
        "mae_mw": grouped.apply(lambda e: e.abs().mean()),
        "bias_mw": grouped.mean(),
    })
    return table.round(1).reset_index(names="hour")
def accuracy_by_horizon(cleaned_forecasts: pd.DataFrame, actuals: pd.DataFrame, horizons=range(1, 49)) -> pd.DataFrame:
    """For each horizon N (hours ahead), how accurate were forecasts made at least N hours early?"""
    rows = []
    for h in horizons:
        matched = match_with_actuals(forecasts_at_horizon(cleaned_forecasts, h), actuals)
        m = compute_metrics(matched)
        rows.append({
            "horizon_hours": h,
            "mae_mw": m.get("mae_mw"),
            "bias_mw": m.get("bias_mw"),
            "p90_error_mw": m.get("p90_error_mw"),
            "hours": m["hours"],
        })
    return pd.DataFrame(rows)