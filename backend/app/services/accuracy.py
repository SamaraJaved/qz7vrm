"""
Accuracy: put forecasts next to actuals and measure the errors.
"""

import pandas as pd

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