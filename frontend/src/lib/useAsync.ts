import { useEffect, useState } from 'react';

export type AsyncState<T> =
  | { status: 'loading'; data?: undefined; error?: undefined }
  | { status: 'success'; data: T; error?: undefined }
  | { status: 'error'; data?: undefined; error: unknown };

/**
 * Runs `load` whenever `key` changes and ignores results from superseded calls.
 * Every state ends in success or error, so loading indicators never stay forever.
 */
export function useAsync<T>(load: () => Promise<T>, key: string): AsyncState<T> & { retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<AsyncState<T> & { key: string }>({ status: 'loading', key: '' });
  const requestKey = `${key}#${attempt}`;

  useEffect(() => {
    let active = true;
    load().then(
      data => { if (active) setState({ status: 'success', data, key: requestKey }); },
      error => { if (active) setState({ status: 'error', error, key: requestKey }); },
    );
    return () => { active = false; };
    // `load` is recreated on every render; `requestKey` identifies the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const current: AsyncState<T> = state.key === requestKey ? state : { status: 'loading' };
  return { ...current, retry: () => setAttempt(a => a + 1) } as AsyncState<T> & { retry: () => void };
}
