import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { AuthFailure, LoginPayload, RegisterPayload, UserProfile } from '@/features/auth/authModels';
import { codePoints, isEmailCandidate, normalizeEmail } from '@/features/auth/authValidation';

// Authentication client. Cookies stay browser-managed; the CSRF token stays in memory only.
export function createAuthApi(http: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  withCredentials: true,
  timeout: 15000,
})) {
  let csrf: string | undefined;
  const expired = new Set<() => void>();
  const messages: Record<string, [number, string]> = {
    INVALID_CREDENTIALS: [401, 'Invalid email or password.'],
    UNAUTHENTICATED: [401, 'Your session has expired. Please log in again.'],
    VALIDATION_ERROR: [400, 'Please check the highlighted fields.'],
    INVALID_REQUEST: [400, 'The submitted request is invalid. Please refresh the page and try again.'],
    EMAIL_CONFLICT: [409, 'An account with this email already exists. Please log in instead.'],
    CSRF_INVALID: [403, 'Security verification failed. Refresh verification, then submit again.'],
    ACCESS_DENIED: [403, 'You do not have permission to perform this action.'],
  };
  function failure(error: unknown): AuthFailure {
    const response = axios.isAxiosError(error) ? error.response : undefined;
    const data = response?.data;
    const code = data && typeof data === 'object' && typeof data.code === 'string' ? data.code : undefined;
    const known = code ? messages[code] : undefined;
    const safe: AuthFailure = {
      status: response?.status,
      code,
      message: known && known[0] === response?.status ? known[1]
        : 'We could not confirm the result. Please try again when you are ready.',
    };
    // Never display server detail, rejected values, or arbitrary field messages.
    if (response?.status === 400 && code === 'VALIDATION_ERROR') {
      safe.fields = {};
      for (const field of ['email', 'password', 'fullName'] as const) {
        if (data.errors && Object.prototype.hasOwnProperty.call(data.errors, field))
          safe.fields[field] = 'This field does not meet the documented requirements.';
        const issue = Array.isArray(data.fieldErrors)
          ? data.fieldErrors.find((item: { field?: string; code?: string } | null) => item?.field === field) : undefined;
        const label = { email: 'Email address', password: 'Password', fullName: 'Full name' }[field];
        if (issue?.code === 'REQUIRED') safe.fields[field] = `${label} is required.`;
        else if (issue?.code === 'INVALID_FORMAT') safe.fields[field] = field === 'email'
          ? 'Please enter a valid email address.' : `${label} has an invalid format.`;
        else if (issue?.code === 'INVALID_VALUE') safe.fields[field] = `${label} does not meet the documented requirements.`;
        else if (issue) safe.fields[field] = 'This field does not meet the documented requirements.';
      }
    }
    return safe;
  }
  async function request<T>(config: AxiosRequestConfig, expectedStatus = 200): Promise<T> {
    try {
      const response = await http.request<T>({ ...config, withCredentials: true });
      if (response.status !== expectedStatus) throw new Error('Unexpected response');
      return response.data;
    }
    catch (error) {
      const safe = failure(error);
      if (safe.status === 401 && safe.code === 'UNAUTHENTICATED') {
        csrf = undefined;
        expired.forEach(listener => listener());
      }
      if (safe.status === 403 && safe.code === 'CSRF_INVALID') csrf = undefined;
      throw safe;
    }
  }
  async function bootstrap(): Promise<void> {
    csrf = undefined;
    const data = await request<{ headerName: string; token: string }>({ method: 'GET', url: '/auth/csrf' });
    if (!data || data.headerName !== 'X-CSRF-TOKEN' || typeof data.token !== 'string' || !data.token)
      throw new Error('Could not prepare security verification. Please try again.');
    csrf = data.token;
  }
  async function mutate<T>(url: string, data?: unknown, expectedStatus = 200): Promise<T> {
    if (!csrf) await bootstrap();
    return request<T>({ method: 'POST', url, data, headers: { 'X-CSRF-TOKEN': csrf! } }, expectedStatus);
  }
  function profile(data: UserProfile): UserProfile {
    if (!data || typeof data !== 'object' || typeof data.id !== 'string' || typeof data.email !== 'string'
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.id)
      || !isEmailCandidate(data.email) || normalizeEmail(data.email) !== data.email || codePoints(data.email) > 254
      || typeof data.fullName !== 'string' || !data.fullName.trim() || codePoints(data.fullName) > 50
      || !Array.isArray(data.roles)
      || !data.roles.every(role => role === 'CUSTOMER' || role === 'ADMIN'))
      throw new Error('We could not confirm the result. Please try again when you are ready.');
    return { id: data.id, email: data.email, fullName: data.fullName, roles: data.roles };
  }
  return {
    bootstrap,
    clearCsrf: () => { csrf = undefined; },
    onSessionExpired(listener: () => void) { expired.add(listener); return () => { expired.delete(listener); }; },
    me: async () => profile(await request<UserProfile>({ method: 'GET', url: '/auth/me' })),
    register: async (data: RegisterPayload) => profile(await mutate<UserProfile>('/auth/register', {
      fullName: data.fullName, email: normalizeEmail(data.email), password: data.password,
    }, 201)),
    // Refresh is a separate operation: never obscure a confirmed successful login/logout with refresh failure.
    login: async (data: LoginPayload) => {
      const result = await mutate<UserProfile>('/auth/login', { email: normalizeEmail(data.email), password: data.password });
      csrf = undefined;
      return profile(result);
    },
    logout: async () => { await mutate<void>('/auth/logout', undefined, 204); csrf = undefined; },
  };
}
const authApi = createAuthApi();
export default authApi;
