"""
Entry point of the backend: creates the FastAPI app.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="WindSight API",
    description="UK wind generation forecasts and their accuracy (January 2026).",
    version="1.0.0",
)

# Allow the React dev server (another address) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    """Simple check that the server is running."""
    return {"status": "ok"}