"""
Tests for the API: real HTTP requests against the app,
but with small fake data injected instead of the real CSVs.
"""

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app.api.data import get_actuals, get_forecasts
from app.main import app


def fake_forecasts() -> pd.DataFrame:
    # One forecast per hour of 15 Jan, published 14 Jan 06:00, always 1,000 MW
    start = pd.date_range("2026-01-15", periods=24, freq="h", tz="UTC")
    publish = pd.Timestamp("2026-01-14 06:00", tz="UTC")
    df = pd.DataFrame({"publishTime": publish, "startTime": start, "generation": 1_000})
    df["horizon_hours"] = (df["startTime"] - df["publishTime"]).dt.total_seconds() / 3600
    return df


def fake_actuals() -> pd.DataFrame:
    # Half-hourly actuals for 15 Jan, always 800 MW
    start = pd.date_range("2026-01-15", periods=48, freq="30min", tz="UTC")
    return pd.DataFrame({"startTime": start, "generation": 800})


@pytest.fixture
def client():
    """A test client whose data comes from the fake tables above."""
    app.dependency_overrides[get_forecasts] = fake_forecasts
    app.dependency_overrides[get_actuals] = fake_actuals
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_forecast_for_a_day(client):
    response = client.get("/api/forecast", params={"delivery_date": "2026-01-15"})

    assert response.status_code == 200
    body = response.json()
    assert body["decision_time"] == "2026-01-14T09:00:00Z"
    assert len(body["points"]) == 24                 # hourly, :30 actuals dropped
    assert body["metrics"]["bias_mw"] == 200         # 1,000 forecast - 800 actual


def test_forecast_outside_january_returns_404(client):
    response = client.get("/api/forecast", params={"delivery_date": "2026-03-01"})
    assert response.status_code == 404


def test_invalid_decision_hour_returns_422(client):
    response = client.get("/api/forecast", params={"delivery_date": "2026-01-15", "decision_hour": 30})
    assert response.status_code == 422


def test_accuracy_with_horizon(client):
    response = client.get("/api/accuracy", params={"horizon_hours": 12})

    assert response.status_code == 200
    body = response.json()
    assert body["method"] == "horizon"
    assert body["metrics"]["hours"] == 24
    assert len(body["by_hour_of_day"]) == 24