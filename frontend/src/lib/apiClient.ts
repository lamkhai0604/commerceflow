import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { withWakeRetry } from '@/lib/serverWake';

/** A failure the UI can safely show: no server detail, only the status, the documented code and Retry-After. */
export interface ApiFailure {
  status?: number;
  code?: string;
  retryAfterSeconds?: number;
  /** Products that could not be fulfilled (insufficient stock). */
  shortages?: Shortage[];
}

export interface Shortage { productName: string; requested: number; available: number }

export const isApiFailure = (value: unknown): value is ApiFailure =>
  !!value && typeof value === 'object' && ('status' in value || 'code' in value) && !(value instanceof Error);

/** Reads only the documented shape of `shortages`; anything else is ignored. */
function readShortages(data: unknown): Shortage[] | undefined {
  const list = data && typeof data === 'object' ? (data as { shortages?: unknown }).shortages : undefined;
  if (!Array.isArray(list)) return undefined;
  const result = list.flatMap((item): Shortage[] => {
    if (!item || typeof item !== 'object') return [];
    const { productName, requested, available } = item as Record<string, unknown>;
    if (!Number.isInteger(requested) || !Number.isInteger(available)) return [];
    return [{ productName: typeof productName === 'string' ? productName.slice(0, 200) : 'A product', requested: requested as number, available: available as number }];
  });
  return result.length ? result.slice(0, 30) : undefined;
}

/**
 * Same-origin API client. Cookies stay browser-managed and the CSRF token stays in memory only. Reads may be
 * repeated while the hosted API wakes up; a write rejected for CSRF is sent once more with a fresh token, because
 * that rejection happens before the server does anything (the token changes at log-in and log-out).
 */
export function createApiClient(http: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  withCredentials: true,
  timeout: 20000,
})) {
  let csrf: string | undefined;

  function failure(error: unknown): ApiFailure {
    const response = axios.isAxiosError(error) ? error.response : undefined;
    const data = response?.data;
    const code = data && typeof data === 'object' && typeof data.code === 'string' ? data.code : undefined;
    const retry = Number(response?.headers?.['retry-after']);
    return {
      status: response?.status, code,
      retryAfterSeconds: Number.isFinite(retry) && retry > 0 ? retry : undefined,
      shortages: code === 'INSUFFICIENT_STOCK' ? readShortages(data) : undefined,
    };
  }

  async function token(): Promise<string> {
    if (csrf) return csrf;
    const response = await withWakeRetry(() => http.get<{ headerName: string; token: string }>('/auth/csrf', { withCredentials: true }));
    if (response.data?.headerName !== 'X-CSRF-TOKEN' || typeof response.data.token !== 'string' || !response.data.token)
      throw new Error('Could not prepare security verification.');
    csrf = response.data.token;
    return csrf;
  }

  async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    try { return (await withWakeRetry(() => http.get<T>(url, { params, withCredentials: true }))).data; }
    catch (error) { throw failure(error); }
  }

  async function write<T>(config: AxiosRequestConfig, expectedStatus = 200): Promise<{ data: T; replayed: boolean }> {
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await http.request<T>({
          ...config, withCredentials: true, headers: { ...config.headers, 'X-CSRF-TOKEN': await token() },
        });
        if (response.status !== expectedStatus) throw new Error('Unexpected response');
        return { data: response.data, replayed: response.headers?.['idempotent-replayed'] === 'true' };
      } catch (error) {
        const safe = failure(error);
        if (safe.status === 403 && safe.code === 'CSRF_INVALID') {
          csrf = undefined;
          if (attempt === 0) continue;
        }
        throw error instanceof Error && !axios.isAxiosError(error) ? error : safe;
      }
    }
  }

  return { get, write, clearCsrf: () => { csrf = undefined; } };
}
