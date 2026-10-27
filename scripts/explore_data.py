import json
from pathlib import Path

import pandas as pd
import requests

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1/datasets"
RAW_DIR = Path("data/raw")


# ---------------------------------------------------------------------------
# 1. Fetching
# ---------------------------------------------------------------------------
def fetch_json(url: str, params: dict) -> list[dict]:
    """Call an Elexon endpoint and return the list of records."""
    response = requests.get(url, params=params, timeout=60)
    response.raise_for_status()  # crash loudly if the API returns an error
    data = response.json()
    # The /stream endpoints return a plain list; others wrap it in {"data": [...]}
    return data if isinstance(data, list) else data.get("data", [])


def fetch_forecasts(publish_from: str, publish_to: str) -> pd.DataFrame:
    """Wind forecasts (WINDFOR), filtered by WHEN the forecast was published."""
    records = fetch_json(
        f"{BASE_URL}/WINDFOR/stream",
        {"publishDateTimeFrom": publish_from, "publishDateTimeTo": publish_to},
    )
    save_raw("windfor_sample.json", records)
    return pd.DataFrame(records)


def fetch_actuals(date_from: str, date_to: str) -> pd.DataFrame:
    """Actual generation (FUELHH), wind only, filtered by settlement date."""
    records = fetch_json(
        f"{BASE_URL}/FUELHH/stream",
        {"settlementDateFrom": date_from, "settlementDateTo": date_to, "fuelType": "WIND"},
    )
    save_raw("fuelhh_sample.json", records)
    return pd.DataFrame(records)


def save_raw(filename: str, records: list[dict]) -> None:
    """Keep a copy of the raw response so we can inspect it later without refetching."""
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    (RAW_DIR / filename).write_text(json.dumps(records, indent=2))


# ---------------------------------------------------------------------------
# 2. Inspecting
# ---------------------------------------------------------------------------
def describe(name: str, df: pd.DataFrame) -> None:
    print(f"\n{'=' * 60}\n{name}\n{'=' * 60}")
    if df.empty:
        print("No rows returned - check the parameters.")
        return
    print(f"Rows: {len(df)}")
    print(f"Columns: {list(df.columns)}")
    print("\nFirst 3 rows:")
    print(df.head(3).to_string())


def inspect_forecasts(df: pd.DataFrame) -> None:
    if df.empty:
        return
    df = df.copy()
    df["startTime"] = pd.to_datetime(df["startTime"], utc=True)
    df["publishTime"] = pd.to_datetime(df["publishTime"], utc=True)

    # Horizon = how many hours before the target half-hour the forecast was made
    df["horizon_h"] = (df["startTime"] - df["publishTime"]).dt.total_seconds() / 3600

    print("\nDistinct publish times:", df["publishTime"].nunique())
    print("Forecasts per startTime (how many versions of the same half-hour):")
    print(df.groupby("startTime").size().describe().to_string())
    print("\nHorizon (hours ahead) range:")
    print(df["horizon_h"].describe().to_string())
    print("\nstartTime spacing (should be 30 or 60 min):")
    print(df["startTime"].drop_duplicates().sort_values().diff().value_counts().head().to_string())


def inspect_actuals(df: pd.DataFrame) -> None:
    if df.empty:
        return
    df = df.copy()
    df["startTime"] = pd.to_datetime(df["startTime"], utc=True)
    print("\nDuplicate startTimes:", df["startTime"].duplicated().sum())
    print("Expected half-hours per day: 48 (46 or 50 on clock-change days)")
    print(df.groupby(df["startTime"].dt.date).size().to_string())


# ---------------------------------------------------------------------------
# 3. Run
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    # Small sample: forecasts published on 1 Jan, actuals for 2 Jan (the delivery day)
    forecasts = fetch_forecasts("2026-01-01T00:00:00Z", "2026-01-01T23:59:59Z")
    actuals = fetch_actuals("2026-01-02", "2026-01-02")

    describe("FORECASTS (WINDFOR)", forecasts)
    inspect_forecasts(forecasts)

    describe("ACTUALS (FUELHH, WIND)", actuals)
    inspect_actuals(actuals)