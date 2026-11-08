import type { Mocked } from 'vitest';
import { AnyAction } from 'redux';
import { runSaga, stdChannel } from 'redux-saga';
import authApi from '@/features/auth/authApi';
import authReducer, { authActions, initialState } from './authSlice';
import authSaga, { restoreSession, runAuthOperation } from './authSaga';

vi.mock('@/features/auth/authApi', () => ({ __esModule: true, default: {
  me: vi.fn(), bootstrap: vi.fn(), login: vi.fn(), register: vi.fn(), logout: vi.fn(), onSessionExpired: vi.fn(),
} }));
const api = authApi as Mocked<typeof authApi>;
const user = { id: '11111111-1111-4111-8111-111111111111', email: 'test@example.com', fullName: 'Customer', roles: ['CUSTOMER'] as Array<'CUSTOMER'> };
async function operation(action: AnyAction) {
  let state = authReducer({ ...initialState, initializing: false }, action);
  await runSaga({ dispatch: (a: AnyAction) => { state = authReducer(state, a); } }, runAuthOperation, action).toPromise();
  return state;
}
beforeEach(() => { vi.resetAllMocks(); api.bootstrap.mockResolvedValue(undefined); });
test('startup me restores signed-in profile with one passive request', async () => {
  api.me.mockResolvedValue(user); const actions: unknown[] = [];
  await runSaga({ dispatch: a => actions.push(a) }, restoreSession).toPromise();
  expect(api.me).toHaveBeenCalledTimes(1);
  expect(actions).toContainEqual(authActions.restored(user));
});
test('startup 401 is silent; no login prompt or noisy failure', async () => {
  api.me.mockRejectedValue({ status: 401, code: 'UNAUTHENTICATED' }); const actions: unknown[] = [];
  await runSaga({ dispatch: a => actions.push(a) }, restoreSession).toPromise();
  expect(actions).toContainEqual(authActions.restored(undefined));
  expect(actions.some((a) => (a as AnyAction).type === authActions.failed.type)).toBe(false);
});
test.each([
  { status: 503, message: 'unavailable' },
  { message: 'We could not confirm the result. Please try again when you are ready.' },
  new Error('network'),
])('startup non-401 failure stays quietly signed-out without an alert: %j', async error => {
  api.me.mockRejectedValue(error); api.bootstrap.mockRejectedValue(new Error('network'));
  const actions: AnyAction[] = [];
  await runSaga({ dispatch: (action: AnyAction) => actions.push(action) }, restoreSession).toPromise();
  expect(actions).toContainEqual(authActions.restored(undefined));
  expect(actions).toContainEqual(authActions.csrfReady(false));
  expect(actions.map(a => a.type)).not.toContain(authActions.failed.type);
});
test('registration opens prefilled login with success and never auto-authenticates', async () => {
  api.register.mockResolvedValue(user);
  const state = await operation(authActions.register({ email: user.email, fullName: user.fullName, password: 'test-password' }));
  expect(state).toMatchObject({ dialog: 'login', loginEmail: user.email, isLoggedIn: false });
  expect(state.notice).toContain('Please log in'); expect(api.login).not.toHaveBeenCalled();
});
test('login success survives separate CSRF refresh failure and never replays login', async () => {
  api.login.mockResolvedValue(user); api.bootstrap.mockRejectedValue(new Error('network'));
  const state = await operation(authActions.login({ email: user.email, password: 'x' }));
  expect(state).toMatchObject({ isLoggedIn: true, currentUser: user, csrfReady: false });
  expect(state.pending).toBeUndefined(); expect(api.login).toHaveBeenCalledTimes(1);
});
test('logout succeeds only after server confirmation and refreshes anonymous CSRF', async () => {
  api.logout.mockResolvedValue(undefined); const state = await operation(authActions.logout());
  expect(state.isLoggedIn).toBe(false); expect(state.notice).toContain('logged out');
  expect(api.bootstrap).toHaveBeenCalledTimes(1);
});
test('uncertain logout preserves signed-in state; 401 expires it', async () => {
  const signedIn = { ...initialState, initializing: false, isLoggedIn: true, currentUser: user };
  api.logout.mockRejectedValue({ message: 'We could not confirm logout.' });
  let state = authReducer(signedIn, authActions.logout());
  await runSaga({ dispatch: (a: AnyAction) => { state = authReducer(state, a); } }, runAuthOperation,
    authActions.logout()).toPromise();
  expect(state.isLoggedIn).toBe(true); expect(state.error?.message).toContain('could not confirm');
  expect(api.bootstrap).not.toHaveBeenCalled();
});
test('expired authenticated session opens login; initial anonymous expiry stays quiet', () => {
  const signedIn = { ...initialState, isLoggedIn: true, currentUser: user };
  expect(authReducer(signedIn, authActions.sessionExpired())).toMatchObject({ dialog: 'login', isLoggedIn: false });
  expect(authReducer(initialState, authActions.sessionExpired()).dialog).toBeUndefined();
});

test('logout 401 clears expired identity and prompts login without claiming confirmed logout', async () => {
  api.logout.mockRejectedValue({ status: 401, code: 'UNAUTHENTICATED', message: 'Your session has expired.' });
  let state = authReducer({ ...initialState, initializing: false, isLoggedIn: true, currentUser: user }, authActions.logout());
  await runSaga({ dispatch: (a: AnyAction) => { state = authReducer(state, a); } }, runAuthOperation,
    authActions.logout()).toPromise();
  expect(state).toMatchObject({ isLoggedIn: false, dialog: 'login' });
  expect(state.notice).not.toContain('successfully logged out');
});

const flush = () => new Promise(resolve => setTimeout(resolve, 0));
function startRoot() {
  let state = initialState;
  const channel = stdChannel();
  const dispatch = (action: AnyAction) => { state = authReducer(state, action); channel.put(action); };
  const task = runSaga({ channel, dispatch }, authSaga);
  return { task, dispatch, state: () => state };
}

test('root startup subscribes to expiry, suppresses duplicate writes and tears down subscription', async () => {
  api.me.mockResolvedValue(user);
  const unsubscribe = vi.fn(); let expire: () => void = () => undefined;
  api.onSessionExpired.mockImplementation(listener => { expire = listener; return unsubscribe; });
  let finishLogin!: (value: typeof user) => void;
  api.login.mockImplementation(() => new Promise(resolve => { finishLogin = resolve; }));
  const root = startRoot();
  try {
    expect(root.state().initializing).toBe(true);
    await flush(); expect(root.state().initializing).toBe(false);
    const login = authActions.login({ email: user.email, password: 'secret' });
    root.dispatch(login); root.dispatch(login);
    expect(api.login).toHaveBeenCalledTimes(1);
    finishLogin(user); await flush();
    expect(root.state()).toMatchObject({ isLoggedIn: true, csrfReady: true });
    expire(); await flush();
    expect(root.state()).toMatchObject({ isLoggedIn: false, dialog: 'login', csrfReady: false });
  } finally { root.task.cancel(); await root.task.toPromise(); }
  expect(unsubscribe).toHaveBeenCalledTimes(1);
});

test('root with real auth client rotates CSRF login→refresh→logout and never persists credentials', async () => {
  const axios = (await vi.importActual('axios')).default as typeof import('axios').default;
  const { createAuthApi } = (await vi.importActual('@/features/auth/authApi')) as typeof import('@/features/auth/authApi');
  const requests: Array<{ url?: string; csrf?: unknown }> = []; let token = 0;
  const actual = createAuthApi(axios.create({ adapter: async config => {
    requests.push({ url: config.url, csrf: config.headers?.['X-CSRF-TOKEN'] });
    if (config.url === '/auth/me') return Promise.reject({ isAxiosError: true, response: { status: 401, data: { code: 'UNAUTHENTICATED' } } });
    return { config, status: config.url === '/auth/logout' ? 204 : 200, statusText: 'OK', headers: {},
      data: config.url === '/auth/csrf' ? { headerName: 'X-CSRF-TOKEN', token: `token-${++token}` } : user };
  } }));
  api.me.mockImplementation(actual.me); api.bootstrap.mockImplementation(actual.bootstrap);
  api.login.mockImplementation(actual.login); api.logout.mockImplementation(actual.logout);
  api.onSessionExpired.mockImplementation(actual.onSessionExpired);
  const read = vi.spyOn(Storage.prototype, 'getItem'), write = vi.spyOn(Storage.prototype, 'setItem');
  const remove = vi.spyOn(Storage.prototype, 'removeItem');
  const root = startRoot();
  try {
    await flush(); root.dispatch(authActions.login({ email: user.email, password: 'secret' })); await flush();
    root.dispatch(authActions.logout()); await flush();
    expect(requests.map(r => r.url)).toEqual(['/auth/me', '/auth/csrf', '/auth/login', '/auth/csrf', '/auth/logout', '/auth/csrf']);
    expect(requests[2].csrf).toBe('token-1'); expect(requests[4].csrf).toBe('token-2');
    expect(root.state().isLoggedIn).toBe(false);
    expect(read).not.toHaveBeenCalled(); expect(write).not.toHaveBeenCalled(); expect(remove).not.toHaveBeenCalled();
  } finally { root.task.cancel(); await root.task.toPromise(); read.mockRestore(); write.mockRestore(); remove.mockRestore(); }
});

test.each([{ status: 401, code: 'UNKNOWN' }, { status: 401 }])('startup arbitrary 401 remains quietly signed-out: %j', async error => {
  api.me.mockRejectedValue(error); const actions: AnyAction[] = [];
  await runSaga({ dispatch: (action: AnyAction) => actions.push(action) }, restoreSession).toPromise();
  expect(actions).toContainEqual(authActions.restored(undefined));
  expect(actions.map(a => a.type)).not.toContain(authActions.failed.type);
});

test('explicit CSRF refresh failure is recoverable without replaying login', async () => {
  api.bootstrap.mockRejectedValueOnce({ status: 503, message: 'Could not prepare verification.' });
  const failed = await operation(authActions.refreshCsrf());
  expect(failed.csrfReady).toBe(false); expect(failed.pending).toBeUndefined();
  expect(failed.error?.message).toContain('Could not prepare');
  api.bootstrap.mockResolvedValueOnce(undefined);
  const recovered = await operation(authActions.refreshCsrf());
  expect(recovered.csrfReady).toBe(true); expect(recovered.error).toBeUndefined();
  expect(api.login).not.toHaveBeenCalled();
});

test.each([{ status: 401, code: 'UNKNOWN' }, { status: 401 }])('logout arbitrary 401 already expires identity without claiming success: %j', async error => {
  api.logout.mockRejectedValue({ ...error, message: 'We could not confirm the result.' });
  let state = authReducer({ ...initialState, initializing: false, isLoggedIn: true, currentUser: user }, authActions.logout());
  await runSaga({ dispatch: (a: AnyAction) => { state = authReducer(state, a); } }, runAuthOperation, authActions.logout()).toPromise();
  expect(state).toMatchObject({ isLoggedIn: false, dialog: 'login' });
  expect(state.notice).not.toContain('successfully logged out');
});
