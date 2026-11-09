import axios from 'axios';
import { useSyncExternalStore } from 'react';

/*
 * The hosted API runs on a free instance that sleeps when idle (S3-D01); a cold start measured about two minutes.
 * Read-only requests are safe to repeat, so they are retried while the server wakes, and the storefront shows
 * a notice in the meantime (requirement: any noticeable wait shows progress). State-changing requests are never
 * retried here.
 */

let waking = false;
const listeners = new Set<() => void>();
function setWaking(value: boolean) {
  if (waking === value) return;
  waking = value;
  listeners.forEach(listener => listener());
}

/** Current state, for code outside React. */
export function isServerWaking() {
  return waking;
}

export function useServerWaking() {
  return useSyncExternalStore(
    listener => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => waking,
    () => false,
  );
}

/** Statuses a proxy or sleeping instance returns while the API is starting. */
function isWakeFailure(error: unknown) {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  return !error.response || status === 502 || status === 503 || status === 504;
}

export interface WakeOptions {
  /** Total time to keep retrying, in milliseconds. */
  budgetMs?: number;
  delayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

/** Runs a safe (read-only) request, retrying with a notice while the API wakes up. */
export async function withWakeRetry<T>(request: () => Promise<T>, options: WakeOptions = {}): Promise<T> {
  const { budgetMs = 180_000, delayMs = 3_000, sleep = ms => new Promise(r => setTimeout(r, ms)), now = Date.now } = options;
  const started = now();
  for (;;) {
    try {
      const result = await request();
      setWaking(false);
      return result;
    } catch (error) {
      if (!isWakeFailure(error) || now() - started >= budgetMs) {
        setWaking(false);
        throw error;
      }
      setWaking(true);
      await sleep(delayMs);
    }
  }
}

/** Starts waking the API as early as possible; failures are ignored because pages handle their own errors. */
export function warmUpApi(baseUrl: string) {
  void withWakeRetry(() => axios.get(`${baseUrl}/health`, { timeout: 20_000 })).catch(() => undefined);
}
