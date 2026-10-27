"""
One-time download script: fetch all January 2026 data and save it.

Run from the backend/ folder:
    python -m scripts.fetch_data
"""

from app import config
from app.clients.elexon_client import ElexonClient
from app.storage import data_store


def main() -> None:
    client = ElexonClient()

    print("Downloading wind forecasts (one day at a time)...")
    forecasts = client.get_wind_forecasts(config.FORECAST_PUBLISH_FROM, config.FORECAST_PUBLISH_TO)
    data_store.save_forecasts(forecasts)
    print(f"  saved {len(forecasts):,} rows -> {config.FORECASTS_FILE}")

    print("Downloading actual wind generation (one week at a time)...")
    actuals = client.get_wind_actuals(config.ACTUALS_DATE_FROM, config.ACTUALS_DATE_TO)
    data_store.save_actuals(actuals)
    print(f"  saved {len(actuals):,} rows -> {config.ACTUALS_FILE}")

    # Quick sanity checks so we notice problems immediately
    print("\nChecks:")
    print(f"  forecast publish times: {forecasts['publishTime'].min()} -> {forecasts['publishTime'].max()}")
    print(f"  actuals:                {actuals['startTime'].min()} -> {actuals['startTime'].max()}")
    print(f"  actual days found:      {actuals['startTime'].str[:10].nunique()} (expected 32)")


if __name__ == "__main__":
    main()