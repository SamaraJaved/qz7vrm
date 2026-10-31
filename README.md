# WindSight

Day-ahead decision support for a UK energy utility's power trading team.

The team buys electricity on the **day-ahead market**: on day D-1 they decide how much power to buy for
delivery day D. Wind covers part of demand, so the amount they must buy from other sources depends on the
national wind generation forecast. WindSight answers two questions:

1. **What was the latest wind forecast available when we had to decide?** (Decision view)
2. **How accurate are those forecasts, in numbers?** so a safety margin can be sized. (Forecast accuracy)

**Live demo:** https://windsight-red.vercel.app  
**Live API:** https://windsight-api-beta.vercel.app/docs

## Key finding (January 2026)

Forecasts made at the default 09:00 UTC decision time were **consistently too high**:

| Metric | Value |
|---|---|
| Mean absolute error (MAE) | 2,023 MW (17.9% of actual) |
| RMSE | 2,497 MW |
| Bias (mean of forecast − actual) | **+1,746 MW** (over-forecast) |
| P10 / P90 error | −426 MW / +4,154 MW |
| Hours evaluated | 744 |

Trusting the forecast as-is would usually leave the buyer **short** of power. In 9 of 10 hours the
over-forecast was below 4,154 MW, so planning for wind at "forecast − 4,154 MW" would have covered 90% of
hours. Accuracy also gets worse the further ahead the forecast is made: MAE grows from about 1,685 MW at
1 hour ahead to about 2,301 MW at 48 hours ahead.

## Features

**Decision view**
- Pick a delivery day (2 Jan – 1 Feb 2026) and the decision time on D-1 (00:00–23:00 UTC, default 09:00).
- Shows which forecast was used and when it was published, e.g. *"Decision at 14 Jan 09:00 UTC · using
  forecast published 07:30 UTC (1.5 h earlier)"*.
- Hourly forecast vs actual for the day, plus a shaded **likely actual range**: the 80% range implied by
  January's forecast errors at the same decision time.

**Forecast accuracy**
- Evaluate either **at decision time** (the forecast the trader would actually have seen) or at a
  **fixed horizon** (forecasts made at least N hours ahead, 1–48 h).
- MAE, RMSE, bias, P10–P90 range, hours evaluated, plus a plain-English summary sentence.
- Full-month forecast vs actual timeline, error by hour of day, and accuracy vs forecast horizon.

## Data and method

Only Elexon BMRS national wind data is used:

| Dataset | Use | Fields |
|---|---|---|
| [FUELHH](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream) (`fuelType = WIND`) | Actual generation, half-hourly | `startTime`, `generation` |
| [WINDFOR](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream) | Forecast generation, hourly | `startTime`, `publishTime`, `generation` |

- **Scope:** purchase decisions made in January 2026, i.e. delivery days 2 Jan – 1 Feb 2026.
- **Matching:** each hourly forecast is compared with the actual for the same on-the-hour `startTime`.
- **No look-ahead:** for each delivery hour, the app uses the newest forecast published *on or before*
  the deadline. The decision deadline is D-1 at the chosen hour; the horizon deadline is N hours before
  the delivery hour. Forecasts published after their target time are discarded.
- **Error sign:** `error = forecast − actual`. Positive means the forecast was too high (shortfall risk);
  negative means too low (surplus).
- **Likely actual range:** since `actual = forecast − error`, the P10/P90 errors give an 80% range of
  `[forecast − P90, forecast − P10]`, floored at 0 MW.
- **Caveat:** the persistent positive bias may partly reflect wind curtailment (turbines told to reduce
  output), which lowers metered generation. This is a possible explanation, not a confirmed one.

The data was downloaded once from the Elexon API (`python -m scripts.fetch_data`) and is stored as CSV in
`backend/data/`, so the app runs without calling Elexon.

## Architecture

```
React (Vite, Recharts)  ──HTTP /api──▶  FastAPI  ──▶  pandas services  ──▶  CSV data (Elexon)
```

```
backend/
├── app/
│   ├── main.py                    FastAPI app, CORS
│   ├── config.py                  date ranges, file paths, CORS origins
│   ├── api/routes.py              endpoints: shape requests and responses
│   ├── api/schemas.py             Pydantic response models
│   ├── api/data.py                loads the CSVs once and caches them in memory
│   ├── services/forecast_selection.py   latest forecast before a deadline (no look-ahead)
│   ├── services/accuracy.py       join with actuals, metrics, by-hour and by-horizon tables
│   ├── clients/elexon_client.py   Elexon BMRS API client (used by the fetch script)
│   └── storage/data_store.py      CSV save and load
├── scripts/fetch_data.py          one-off download of January 2026 data
├── data/                          forecasts.csv, actuals.csv
└── tests/                         pytest: selection, metrics, API
frontend/src/
├── api/client.js                  fetch wrapper and one function per endpoint
├── hooks/useApi.js                {data, loading, error, retry}; cancels stale requests
├── pages/                         DecisionView, AccuracyView: hold state and fetch data
├── charts/                        four Recharts charts (presentational only)
├── components/                    MetricCard, ChartCard, ChartTooltip, StatusPanel
└── utils/format.js                MW, time and date formatting (always UTC)
```

### API

| Endpoint | Returns |
|---|---|
| `GET /api/health` | `{"status": "ok"}` |
| `GET /api/forecast?delivery_date=YYYY-MM-DD&decision_hour=0..23` | Forecast used for that day, publish time, 24 hourly points, metrics |
| `GET /api/accuracy?decision_hour=0..23` | Month-wide metrics at a decision time, by hour of day, all points |
| `GET /api/accuracy?horizon_hours=1..48` | Same, for forecasts made at least N hours ahead |
| `GET /api/accuracy/horizons` | MAE, bias, P90 and hours evaluated for each horizon 1–48 h |

Interactive API docs are available at `/docs` when the backend is running.

## Running locally

### With Docker (recommended)

```bash
docker compose up --build
```

- App: http://localhost:8080
- API: http://localhost:8000/docs

nginx serves the built React app and forwards `/api` to the backend container.

### Without Docker

Backend (Python 3.11+):

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload    # http://localhost:8000
pytest                           # run the tests
```

Frontend (Node 20.19+), in a second terminal:

```bash
cd frontend
npm install
npm run dev                      # http://localhost:5173 (proxies /api to :8000)
npm run lint
npm run build
```

To re-download the data from Elexon: `cd backend && python -m scripts.fetch_data`.

## Deployment (Vercel)

The app is deployed as two Vercel projects from this one repository.

1. **Backend:** create a Vercel project with **Root Directory = `backend`**. Vercel detects the FastAPI
   app in `app/main.py` and installs `requirements.txt`; `vercel.json` bundles the CSV data with it.
   Set the environment variable `CORS_ORIGINS` to the frontend URL, e.g. `https://windsight.vercel.app`.
2. **Frontend:** create a second Vercel project with **Root Directory = `frontend`** (framework preset:
   Vite). Set `VITE_API_BASE_URL` to the backend URL, e.g. `https://windsight-api.vercel.app`.
3. Redeploy the frontend after setting `VITE_API_BASE_URL`, because Vite builds that value into the
   bundle. Then check `<backend-url>/api/health` and open the frontend URL.

