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
def pick_latest_before_deadline(forecasts: pd.DataFrame, deadline_for) -> pd.DataFrame:
    """
    For each target hour (startTime), keep the NEWEST forecast
    published on or before that hour's deadline.

    deadline_for: a function that takes the startTime column
                  and returns the deadline for each row.
    """
    deadlines = deadline_for(forecasts["startTime"])
    eligible = forecasts[forecasts["publishTime"] <= deadlines]
    latest_rows = eligible.groupby("startTime")["publishTime"].idxmax()
    return eligible.loc[latest_rows].sort_values("startTime").reset_index(drop=True)


def forecasts_at_horizon(forecasts: pd.DataFrame, horizon_hours: float) -> pd.DataFrame:
    """Accuracy view: deadline = target hour minus N hours."""
    return pick_latest_before_deadline(
        forecasts,
        lambda start: start - pd.Timedelta(hours=horizon_hours),
    )


def forecasts_for_decision(forecasts: pd.DataFrame, decision_hour: int = 9) -> pd.DataFrame:
    """Decision view: deadline = the day before, at decision_hour (UTC)."""
    def deadline(start):
        return start.dt.floor("D") - pd.Timedelta(days=1) + pd.Timedelta(hours=decision_hour)

    return pick_latest_before_deadline(forecasts, deadline)