"""
Settings for the whole backend, kept in ONE place.
"""

import os
from pathlib import Path

# Where Elexon's API lives
ELEXON_BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1/datasets"

# Scope: purchase decisions made in January 2026
FORECAST_PUBLISH_FROM = "2025-12-30T00:00:00Z"
FORECAST_PUBLISH_TO = "2026-02-01T23:59:59Z"

ACTUALS_DATE_FROM = "2026-01-01"
ACTUALS_DATE_TO = "2026-02-01"

# Where downloaded data is saved (backend/data/)
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
FORECASTS_FILE = DATA_DIR / "forecasts.csv"
ACTUALS_FILE = DATA_DIR / "actuals.csv"
# Delivery days we evaluate: decisions in January -> deliveries 2 Jan to 1 Feb
DELIVERY_FROM = "2026-01-02"
DELIVERY_TO = "2026-02-01"

# Frontend addresses allowed to call the API (comma-separated in the env var)
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")