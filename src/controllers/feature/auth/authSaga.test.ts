import { AnyAction } from 'redux';
import { runSaga } from 'redux-saga';
import authApi from 'controllers/api/authApi';
import authReducer, { authActions, initialState } from './authSlice';
import { restoreSession, runAuthOperation } from './authSaga';

jest.mock('controllers/api/authApi', () => ({ __esModule: true, default: {
  me: jest.fn(), bootstrap: jest.fn(), login: jest.fn(), register: jest.fn(), logout: jest.fn(),
} }));
const api = authApi as jest.Mocked<typeof authApi>;
const user = { id: 'id', email: 'test@example.com', fullName: 'Customer', roles: ['CUSTOMER'] as Array<'CUSTOMER'> };
async function operation(action: AnyAction) {
  let state = authReducer({ ...initialState, initializing: false }, action);
  await runSaga({ dispatch: (a: AnyAction) => { state = authReducer(state, a); } }, runAuthOperation, action).toPromise();
  return state;
}
beforeEach(() => { jest.resetAllMocks(); api.bootstrap.mockResolvedValue(undefined); });
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
  expect(actions.some((a: any) => a.type === authActions.failed.type)).toBe(false);
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
