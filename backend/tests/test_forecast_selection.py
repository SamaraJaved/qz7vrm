"""
Tests for the librarian: cleaning and picking forecasts.
Each test uses a tiny hand-made table where we KNOW the right answer.
"""

import pandas as pd

from app.services.forecast_selection import (
    clean_forecasts,
    forecasts_at_horizon,
    forecasts_for_decision,
)


def ts(text: str) -> pd.Timestamp:
    """Shortcut: '2026-01-05 09:00' -> a UTC timestamp."""
    return pd.Timestamp(text, tz="UTC")


def make_forecasts(rows: list[tuple[str, str, int]]) -> pd.DataFrame:
    """rows = [(publishTime, startTime, generation), ...]"""
    return pd.DataFrame(
        {
            "publishTime": [ts(p) for p, _, _ in rows],
            "startTime": [ts(s) for _, s, _ in rows],
            "generation": [g for _, _, g in rows],
        }
    )


def test_clean_removes_forecasts_about_the_past():
    df = make_forecasts([
        ("2026-01-05 12:00", "2026-01-06 15:00", 100),  # real forecast (27h ahead)
        ("2026-01-05 12:00", "2026-01-05 10:00", 200),  # about the past -> removed
        ("2026-01-05 12:00", "2026-01-05 12:00", 300),  # same time, not ahead -> removed
    ])

    cleaned = clean_forecasts(df)

    assert list(cleaned["generation"]) == [100]
    assert cleaned["horizon_hours"].iloc[0] == 27


def test_picks_newest_forecast_published_before_deadline():
    # Target: Tuesday 15:00. Decision deadline: Monday 09:00.
    df = clean_forecasts(make_forecasts([
        ("2026-01-05 03:00", "2026-01-06 15:00", 10_000),
        ("2026-01-05 06:00", "2026-01-06 15:00", 11_000),  # newest allowed
        ("2026-01-05 12:00", "2026-01-06 15:00", 10_500),  # too late
        ("2026-01-05 18:00", "2026-01-06 15:00", 9_800),   # too late
    ]))

    picked = forecasts_for_decision(df, decision_hour=9)

    assert len(picked) == 1
    assert picked["generation"].iloc[0] == 11_000


def test_decision_deadline_is_inclusive():
    # A forecast published exactly AT the decision time is allowed.
    df = clean_forecasts(make_forecasts([
        ("2026-01-05 06:00", "2026-01-06 15:00", 1),
        ("2026-01-05 09:00", "2026-01-06 15:00", 2),
    ]))

    assert forecasts_for_decision(df, decision_hour=9)["generation"].iloc[0] == 2


def test_horizon_rule_never_uses_forecasts_made_too_late():
    df = clean_forecasts(make_forecasts([
        ("2026-01-05 10:00", "2026-01-06 12:00", 1),  # 26h ahead
        ("2026-01-05 13:00", "2026-01-06 12:00", 2),  # 23h ahead -> too late for 24h
    ]))

    picked = forecasts_at_horizon(df, horizon_hours=24)

    assert picked["generation"].iloc[0] == 1
    assert (picked["horizon_hours"] >= 24).all()


def test_hour_with_no_early_enough_forecast_is_dropped():
    df = clean_forecasts(make_forecasts([
        ("2026-01-06 10:00", "2026-01-06 12:00", 1),  # only 2h ahead
    ]))

    assert forecasts_at_horizon(df, horizon_hours=24).empty