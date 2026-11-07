import { useCallback, useEffect, useState } from 'react';

type Outcome<T> = { status: 'success'; data: T } | { status: 'error'; error: unknown };

export interface AsyncState<T> {
  status: 'loading' | 'success' | 'error';
  /** Latest successful data; kept while reloading so tables don't flash empty between pages. */
  data: T | undefined;
  error: unknown;
  reload: () => void;
}

/**
 * Runs `load` whenever it changes (memoise it with useCallback) and aborts stale requests.
 * Loading is derived (the stored result belongs to an older `load`) rather than set inside the
 * effect, so a slow old response can never overwrite a newer one.
 */
export function useAsync<T>(load: (signal: AbortSignal) => Promise<T>): AsyncState<T> {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    load: typeof load;
    attempt: number;
    outcome: Outcome<T>;
  }>();
  const [lastData, setLastData] = useState<T>();

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then(
      (data) => {
        if (controller.signal.aborted) return;
        setResult({ load, attempt, outcome: { status: 'success', data } });
        setLastData(data);
      },
      (error: unknown) => {
        if (!controller.signal.aborted)
          setResult({ load, attempt, outcome: { status: 'error', error } });
      },
    );
    return () => controller.abort();
  }, [load, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const current = result?.load === load && result.attempt === attempt ? result.outcome : undefined;

  return {
    status: current?.status ?? 'loading',
    data: current?.status === 'success' ? current.data : lastData,
    error: current?.status === 'error' ? current.error : undefined,
    reload,
  };
}
