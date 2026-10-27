"""
Tests for the examiner: matching forecasts with actuals and scoring them.
"""

import pandas as pd
import pytest

from app.services.accuracy import compute_metrics, match_with_actuals


def ts(text: str) -> pd.Timestamp:
    return pd.Timestamp(text, tz="UTC")


def test_match_keeps_hours_in_both_tables_and_inside_date_range():
    forecasts = pd.DataFrame({
        "publishTime": [ts("2026-01-04 09:00")] * 3,
        "startTime": [ts("2026-01-05 00:00"), ts("2026-01-05 01:00"), ts("2026-01-06 00:00")],
        "generation": [100, 200, 300],
    })
    actuals = pd.DataFrame({
        "startTime": [ts("2026-01-05 00:00"), ts("2026-01-05 00:30"), ts("2026-01-06 00:00")],
        "generation": [90, 95, 310],
    })

    matched = match_with_actuals(forecasts, actuals, date_from="2026-01-05", date_to="2026-01-05")

    # 01:00 has no actual, 00:30 has no forecast, 6 Jan is outside the range
    assert list(matched["startTime"]) == [ts("2026-01-05 00:00")]
    assert matched["forecast_mw"].iloc[0] == 100
    assert matched["actual_mw"].iloc[0] == 90


def test_error_is_positive_when_forecast_too_high():
    forecasts = pd.DataFrame({
        "publishTime": [ts("2026-01-04 09:00")],
        "startTime": [ts("2026-01-05 00:00")],
        "generation": [1_000],
    })
    actuals = pd.DataFrame({"startTime": [ts("2026-01-05 00:00")], "generation": [700]})

    matched = match_with_actuals(forecasts, actuals, date_from="2026-01-05", date_to="2026-01-05")

    assert matched["error_mw"].iloc[0] == 300


def test_metrics_on_known_errors():
    # errors: +100, -100, +300, -300
    matched = pd.DataFrame({"forecast_mw": [1100, 900, 1300, 700], "actual_mw": [1000] * 4})
    matched["error_mw"] = matched["forecast_mw"] - matched["actual_mw"]

    m = compute_metrics(matched)

    assert m["hours"] == 4
    assert m["mae_mw"] == 200            # (100+100+300+300) / 4
    assert m["bias_mw"] == 0             # they cancel out
    assert m["rmse_mw"] == pytest.approx(223.6, abs=0.1)  # sqrt(50,000)
    assert m["mae_pct_of_actual"] == 20  # 200 / 1000
    assert m["max_over_forecast_mw"] == 300
    assert m["max_under_forecast_mw"] == -300


def test_metrics_with_no_data():
    assert compute_metrics(pd.DataFrame(columns=["error_mw", "actual_mw"])) == {"hours": 0}