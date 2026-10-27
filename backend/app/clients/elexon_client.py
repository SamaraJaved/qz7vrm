"""
Elexon client: the ONLY file that talks to the Elexon API.
"""

from datetime import date, datetime, timedelta

import pandas as pd
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from app.config import ELEXON_BASE_URL


class ElexonClient:
    def __init__(self, base_url: str = ELEXON_BASE_URL, timeout: int = 60):
        self.base_url = base_url
        self.timeout = timeout
        self.session = self._build_session()

    # ---------------- Public methods ----------------
    def get_wind_forecasts(self, publish_from: str, publish_to: str) -> pd.DataFrame:
        """Wind forecasts (WINDFOR), selected by WHEN they were published."""
        frames = []
        for chunk_start, chunk_end in self._daily_chunks(publish_from, publish_to):
            records = self._get(
                "WINDFOR/stream",
                {"publishDateTimeFrom": chunk_start, "publishDateTimeTo": chunk_end},
            )
            frames.append(pd.DataFrame(records))

        df = pd.concat(frames, ignore_index=True)
        df = df[["publishTime", "startTime", "generation"]]
        return df.drop_duplicates(subset=["publishTime", "startTime"]).reset_index(drop=True)

    def get_wind_actuals(self, date_from: str, date_to: str) -> pd.DataFrame:
        """Actual wind generation (FUELHH, fuelType=WIND), by settlement date."""
        frames = []
        for chunk_start, chunk_end in self._weekly_date_chunks(date_from, date_to):
            records = self._get(
                "FUELHH/stream",
                {"settlementDateFrom": chunk_start, "settlementDateTo": chunk_end, "fuelType": "WIND"},
            )
            frames.append(pd.DataFrame(records))

        df = pd.concat(frames, ignore_index=True)
        df = df[["startTime", "generation"]]
        return df.drop_duplicates(subset=["startTime"]).sort_values("startTime").reset_index(drop=True)

    # ---------------- Private helpers ----------------
    def _get(self, path: str, params: dict) -> list[dict]:
        """Send one request and return the list of records."""
        response = self.session.get(f"{self.base_url}/{path}", params=params, timeout=self.timeout)
        response.raise_for_status()
        data = response.json()
        return data if isinstance(data, list) else data.get("data", [])

    @staticmethod
    def _build_session() -> requests.Session:
        """A session that retries automatically if Elexon is briefly unavailable."""
        retry = Retry(total=3, backoff_factor=1, status_forcelist=[429, 500, 502, 503, 504])
        session = requests.Session()
        session.mount("https://", HTTPAdapter(max_retries=retry))
        return session

    @staticmethod
    def _daily_chunks(start_iso: str, end_iso: str):
        """Split a datetime range into one-day pieces."""
        start = datetime.fromisoformat(start_iso.replace("Z", "+00:00"))
        end = datetime.fromisoformat(end_iso.replace("Z", "+00:00"))
        while start < end:
            chunk_end = min(start + timedelta(days=1), end)
            yield start.strftime("%Y-%m-%dT%H:%M:%SZ"), chunk_end.strftime("%Y-%m-%dT%H:%M:%SZ")
            start = chunk_end

    @staticmethod
    def _weekly_date_chunks(start_str: str, end_str: str):
        """Split a date range into 7-day pieces (both ends included)."""
        start, end = date.fromisoformat(start_str), date.fromisoformat(end_str)
        while start <= end:
            chunk_end = min(start + timedelta(days=6), end)
            yield start.isoformat(), chunk_end.isoformat()
            start = chunk_end + timedelta(days=1)