import { useCallback, useEffect, useMemo, useState } from "react";

// `fetcher(signal)` must be stable (wrap it in useCallback); a new fetcher triggers a new request.
export function useApi(fetcher) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ request: null, data: null, error: null });

  // Each fetcher/attempt pair is one request; its identity tells us which request a result answers.
  const request = useMemo(() => ({ fetcher, attempt }), [fetcher, attempt]);

  useEffect(() => {
    const controller = new AbortController();
    request
      .fetcher(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResult({ request, data, error: null });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setResult({ request, data: null, error });
      });
    return () => controller.abort();
  }, [request]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);
  const loading = result.request !== request;

  // While a new request is in flight the previous data stays, so charts transition instead of flashing.
  return { data: result.data, error: loading ? null : result.error, loading, retry };
}
