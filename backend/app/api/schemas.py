"""
Schemas: the exact SHAPE of every answer the API sends back.
"""

from datetime import date, datetime

from pydantic import BaseModel


class HourlyPoint(BaseModel):
    time: datetime
    forecast_mw: float
    actual_mw: float
    error_mw: float


class Metrics(BaseModel):
    hours: int
    mae_mw: float | None = None
    rmse_mw: float | None = None
    bias_mw: float | None = None
    mae_pct_of_actual: float | None = None
    p10_error_mw: float | None = None
    p90_error_mw: float | None = None
    max_over_forecast_mw: float | None = None
    max_under_forecast_mw: float | None = None


class ForecastResponse(BaseModel):
    delivery_date: date
    decision_time: datetime
    forecast_published_at: datetime | None
    points: list[HourlyPoint]
    metrics: Metrics


class HourOfDayError(BaseModel):
    hour: int
    mae_mw: float
    bias_mw: float


class AccuracyResponse(BaseModel):
    method: str
    decision_hour: int | None
    horizon_hours: int | None
    metrics: Metrics
    by_hour_of_day: list[HourOfDayError]
    points: list[HourlyPoint]


class HorizonRow(BaseModel):
    horizon_hours: int
    mae_mw: float | None
    bias_mw: float | None
    p90_error_mw: float | None
    hours: int