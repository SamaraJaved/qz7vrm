"""
Loads the data ONCE and keeps it in memory for every request.
"""

from functools import lru_cache

import pandas as pd

from app.services.forecast_selection import clean_forecasts
from app.storage import data_store


@lru_cache
def get_forecasts() -> pd.DataFrame:
    """Cleaned forecasts (only real forecasts, with horizon_hours)."""
    return clean_forecasts(data_store.load_forecasts())


@lru_cache
def get_actuals() -> pd.DataFrame:
    """Actual wind generation."""
    return data_store.load_actuals()