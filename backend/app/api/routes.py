"""
Routes: the API's menu. Each function = one endpoint.
Routes only read the request, call the services, and shape the answer.
"""

from datetime import date, datetime, time, timedelta, timezone

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.data import get_actuals, get_forecasts
from app.api.schemas import ForecastResponse, HourlyPoint, Metrics
from app.config import DELIVERY_FROM, DELIVERY_TO
from app.services.accuracy import compute_metrics, match_with_actuals
from app.services.forecast_selection import forecasts_for_decision

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