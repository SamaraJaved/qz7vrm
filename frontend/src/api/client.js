const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

async function fetchJson(path, params, signal) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value != null),
  ).toString();
  const url = `${API_BASE}${path}${query ? `?${query}` : ""}`;

  let response;
  try {
    response = await fetch(url, { signal });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error("Can't reach the WindSight API. Check that the backend is running on port 8000.");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    if (typeof body?.detail === "string") throw new Error(body.detail);
    throw new Error(
      response.status >= 500
        ? `The API isn't responding (HTTP ${response.status}). Check that the backend is running.`
        : `The API rejected the request (HTTP ${response.status}).`,
    );
  }
  return response.json();
}

export function getForecast(deliveryDate, decisionHour, signal) {
  return fetchJson("/api/forecast", { delivery_date: deliveryDate, decision_hour: decisionHour }, signal);
}

export function getAccuracy({ decisionHour, horizonHours }, signal) {
  return fetchJson("/api/accuracy", { decision_hour: decisionHour, horizon_hours: horizonHours }, signal);
}

export function getHorizons(signal) {
  return fetchJson("/api/accuracy/horizons", {}, signal);
}
