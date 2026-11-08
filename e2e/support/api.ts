import fs from 'fs';
import path from 'path';
import { Page, BrowserContext } from '@playwright/test';
import { Pool } from 'pg';
export function check(condition: unknown, code: string): asserts condition {
  if (!condition) throw new Error(code); // Codes only: never stringify responses/credentials/cookies.
}
export async function origin(page: Page) { await page.goto('https://localhost:8443/api/v1/health'); }
export async function api(page: Page, method: string, path: string, body?: unknown, token?: string) {
  check(path.startsWith('/api/v1/'), 'API_PREFIX');
  return page.evaluate(async input => {
    const headers: Record<string, string> = {};
    if (input.body !== undefined) headers['Content-Type'] = 'application/json';
    if (input.token) headers['X-CSRF-TOKEN'] = input.token;
    const response = await fetch(input.path, { method: input.method, credentials: 'same-origin', headers,
      body: input.body === undefined ? undefined : JSON.stringify(input.body) });
    let data: any = null;
    try { data = await response.json(); } catch { /* non-JSON handled as a safe failed condition */ }
    return { status: response.status, data, requestId: response.headers.get('X-Request-ID') };
  }, { method, path, body, token });
}
export async function csrf(page: Page) {
  const response = await api(page, 'GET', '/api/v1/auth/csrf');
  check(response.status === 200 && response.data?.headerName === 'X-CSRF-TOKEN'
    && typeof response.data.token === 'string' && response.data.token.length > 0, 'CSRF_BOOTSTRAP');
  return response.data.token as string;
}
export async function cookie(context: BrowserContext) {
  const value = (await context.cookies()).find(item => item.name === 'SESSION');
  check(value, 'SESSION_COOKIE_MISSING'); return value;
}
export async function register(page: Page, user: { email: string; password: string; fullName: string }) {
  const response = await api(page, 'POST', '/api/v1/auth/register', user, await csrf(page));
  check(response.status === 201, 'FIXTURE_REGISTER');
}
export async function openLogin(page: Page) {
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Login', exact: true }).click();
}
export async function login(page: Page, user: { email: string; password: string }) {
  await openLogin(page);
  await page.locator('#auth-email').fill(user.email);
  await page.locator('#auth-password').fill(user.password);
  const refresh = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/auth/csrf');
  const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/auth/login' && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  check((await response).status() === 200, 'UI_LOGIN_STATUS');
  const fresh = await refresh; check(fresh.status() === 200, 'POST_LOGIN_CSRF'); await fresh.finished();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
}
export async function expectProblem(response: Awaited<ReturnType<typeof api>>, status: number, code: string) {
  check(response.status === status && response.data?.code === code, 'PROBLEM_CODE_STATUS');
  const headerValues = response.requestId?.split(',').map(value => value.trim()) || [];
  const directory = process.env.E2E_EVIDENCE_DIR;
  if (directory) {
    const file = path.join(directory, 'correlation.json');
    const rows = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
    rows.push({ status: response.status, expectedCode: code, headerCount: headerValues.length,
      allMatchBody: headerValues.every(value => value === response.data.requestId) });
    fs.writeFileSync(file, JSON.stringify(rows, null, 2));
  }
  check(headerValues.length === 1, 'MULTIPLE_CORRELATION_HEADERS');
  check(typeof response.data.requestId === 'string' && response.data.requestId === response.requestId
    && response.data.instance === `urn:uuid:${response.requestId}`, 'PROBLEM_CORRELATION');
}
export async function expireOwnedSession(email: string) {
  check(email.startsWith(`cf-${process.env.E2E_RUN_ID!.slice(0, 20)}-`) && email.endsWith('@e2e.invalid'), 'OWNED_ACCOUNT_REQUIRED');
  check(process.env.TEST_DB_HOST === 'postgres' && !!process.env.TEST_DB_PASSWORD, 'ISOLATED_DATABASE_REQUIRED');
  const pool = new Pool({ host: 'postgres', database: 'cf_s1c', user: 'cf_s1c', password: process.env.TEST_DB_PASSWORD, connectionTimeoutMillis: 5000 });
  try {
    const result = await pool.query('UPDATE commerceflow.spring_session SET last_access_time = 0, expiry_time = 0 WHERE principal_name = $1', [email]);
    check(result.rowCount && result.rowCount > 0, 'OWNED_SESSION_REQUIRED');
  } catch (error) {
    if (error instanceof Error && error.message === 'OWNED_SESSION_REQUIRED') throw error;
    const code = (error as { code?: string }).code;
    // Deliberately no `cause`: the driver error may carry connection details; only a sanitized code is reported.
    // eslint-disable-next-line preserve-caught-error
    throw new Error(code && ['ECONNREFUSED', 'ENETUNREACH', 'EAI_AGAIN', 'ENOTFOUND'].includes(code)
      ? 'EXPIRY_DATABASE_UNREACHABLE' : 'EXPIRY_FIXTURE_FAILED');
  }
  finally { await pool.end(); }
}
