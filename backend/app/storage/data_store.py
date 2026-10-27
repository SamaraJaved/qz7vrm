"""
Data store: saves downloaded data to CSV files and loads it back.
"""

from pathlib import Path

import pandas as pd

from app.config import ACTUALS_FILE, FORECASTS_FILE


def save_forecasts(df: pd.DataFrame, path: Path = FORECASTS_FILE) -> None:
    _save(df, path)


def save_actuals(df: pd.DataFrame, path: Path = ACTUALS_FILE) -> None:
    _save(df, path)


def load_forecasts(path: Path = FORECASTS_FILE) -> pd.DataFrame:
    """Columns: publishTime, startTime (UTC datetimes), generation (MW)."""
    return pd.read_csv(path, parse_dates=["publishTime", "startTime"])


def load_actuals(path: Path = ACTUALS_FILE) -> pd.DataFrame:
    """Columns: startTime (UTC datetime), generation (MW)."""
    return pd.read_csv(path, parse_dates=["startTime"])


def _save(df: pd.DataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)