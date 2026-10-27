"""
Routes: the API's menu. Each function = one endpoint.
Routes only read the request, call the services, and shape the answer.
"""

from datetime import date, datetime, time, timedelta, timezone
from functools import lru_cache

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.data import get_actuals, get_forecasts
from app.api.schemas import (
    AccuracyResponse,
    ForecastResponse,
    HourlyPoint,
    HourOfDayError,
    HorizonRow,
    Metrics,
)
from app.config import DELIVERY_FROM, DELIVERY_TO
from app.services.accuracy import (
    accuracy_by_horizon,
    compute_metrics,
    error_by_hour_of_day,
    match_with_actuals,
)
from app.services.forecast_selection import forecasts_at_horizon, forecasts_for_decision

router = APIRouter(prefix="/api")

FIRST_DAY = date.fromisoformat(DELIVERY_FROM)
LAST_DAY = date.fromisoformat(DELIVERY_TO)


def to_points(matched: pd.DataFrame) -> list[HourlyPoint]:
    """Turn the matched table into a list of HourlyPoint objects."""
    return [
        HourlyPoint(
            time=row.startTime,
            forecast_mw=float(row.forecast_mw),
            actual_mw=float(row.actual_mw),
            error_mw=float(row.error_mw),
        )
        for row in matched.itertuples()
    ]


@router.get("/forecast", response_model=ForecastResponse)
def get_forecast(
    delivery_date: date = Query(..., description="Delivery day, 2026-01-02 to 2026-02-01"),
    decision_hour: int = Query(9, ge=0, le=23, description="Hour (UTC) on the day before when the decision is made"),
    forecasts: pd.DataFrame = Depends(get_forecasts),
    actuals: pd.DataFrame = Depends(get_actuals),
) -> ForecastResponse:
    """Decision view: the latest forecast available at decision time, for one delivery day."""
    if not FIRST_DAY <= delivery_date <= LAST_DAY:
        raise HTTPException(status_code=404, detail=f"Choose a delivery day between {FIRST_DAY} and {LAST_DAY}.")

    selected = forecasts_for_decision(forecasts, decision_hour)
    day = delivery_date.isoformat()
    matched = match_with_actuals(selected, actuals, date_from=day, date_to=day)

    return ForecastResponse(
        delivery_date=delivery_date,
        decision_time=datetime.combine(delivery_date - timedelta(days=1), time(decision_hour), tzinfo=timezone.utc),
        forecast_published_at=matched["publishTime"].max() if not matched.empty else None,
        points=to_points(matched),
        metrics=Metrics(**compute_metrics(matched)),
    )


@router.get("/accuracy", response_model=AccuracyResponse)
def get_accuracy(
    decision_hour: int = Query(9, ge=0, le=23, description="Used when horizon_hours is not given"),
    horizon_hours: int | None = Query(None, ge=1, le=48, description="If given, evaluate forecasts made at least N hours ahead"),
    forecasts: pd.DataFrame = Depends(get_forecasts),
    actuals: pd.DataFrame = Depends(get_actuals),
) -> AccuracyResponse:
    """Accuracy over all January delivery days, by decision time OR by fixed horizon."""
    if horizon_hours is not None:
        selected = forecasts_at_horizon(forecasts, horizon_hours)
        method = "horizon"
    else:
        selected = forecasts_for_decision(forecasts, decision_hour)
        method = "decision"

    matched = match_with_actuals(selected, actuals)

    return AccuracyResponse(
        method=method,
        decision_hour=decision_hour if method == "decision" else None,
        horizon_hours=horizon_hours,
        metrics=Metrics(**compute_metrics(matched)),
        by_hour_of_day=[HourOfDayError(**row) for row in error_by_hour_of_day(matched).to_dict("records")],
        points=to_points(matched),
    )


@lru_cache
def _horizon_table() -> list[dict]:
    """The 48-horizon table never changes, so compute it once."""
    table = accuracy_by_horizon(get_forecasts(), get_actuals())
    return table.astype(object).where(table.notna(), None).to_dict("records")


@router.get("/accuracy/horizons", response_model=list[HorizonRow])
def get_accuracy_by_horizon() -> list[HorizonRow]:
    """How accuracy changes with forecast horizon (1 to 48 hours ahead)."""
    return [HorizonRow(**row) for row in _horizon_table()]