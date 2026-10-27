"""
Forecast selection: clean forecasts and pick the right version per hour.
"""

import pandas as pd


def clean_forecasts(forecasts: pd.DataFrame) -> pd.DataFrame:
    """
    Add a 'horizon_hours' column and remove rows that are not real forecasts.

    horizon_hours = how many hours BEFORE the target hour the forecast was made.
    A real forecast must be made before the time it is about (horizon > 0).
    """
    df = forecasts.copy()
    df["horizon_hours"] = (df["startTime"] - df["publishTime"]).dt.total_seconds() / 3600
    df = df[df["horizon_hours"] > 0]
    return df.reset_index(drop=True)