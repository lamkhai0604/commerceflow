import { AnyAction } from 'redux';
import { eventChannel, SagaIterator } from 'redux-saga';
import { call, fork, put, take, takeLeading } from 'redux-saga/effects';
import authApi from '@/features/auth/authApi';
import { AuthFailure, UserProfile } from './authModels';
import { authActions } from './authSlice';

function safeFailure(error: unknown): AuthFailure {
  // Only the dedicated client produces safe public feedback. Never log original Axios errors/configs.
  if (error && typeof error === 'object' && 'message' in error) {
    const safe = error as AuthFailure;
    return { message: safe.message, status: safe.status, code: safe.code, fields: safe.fields };
  }
  return { message: 'We could not confirm the result. Please try again when you are ready.' };
}
export function* refreshSecurity(): SagaIterator {
  yield put(authActions.csrfReady(false));
  try { yield call(authApi.bootstrap); yield put(authActions.csrfReady(true)); }
  catch { yield put(authActions.csrfReady(false)); }
  yield put(authActions.securitySettled());
}
export function* restoreSession(): SagaIterator {
  let profile: UserProfile | undefined;
  // UI-02 / S1C-ADR-04: startup is passive. Any failure (401, network, unavailable API) leaves a quiet
  // signed-out state; recovery is offered only when the customer starts an authentication action.
  try { profile = yield call(authApi.me); }
  catch { profile = undefined; }
  // Keep startup controls disabled until the watcher is ready to accept mutations.
  yield call(refreshSecurity);
  yield put(authActions.restored(profile));
}
export function* runAuthOperation(action: AnyAction): SagaIterator {
  try {
    if (authActions.login.match(action)) {
      const profile: UserProfile = yield call(authApi.login, action.payload);
      yield put(authActions.loginSuccess(profile));
      yield call(refreshSecurity);
    } else if (authActions.register.match(action)) {
      const profile: UserProfile = yield call(authApi.register, action.payload);
      yield put(authActions.registered(profile.email));
    } else if (authActions.logout.match(action)) {
      yield call(authApi.logout);
      yield put(authActions.loggedOut());
      yield call(refreshSecurity);
    } else if (authActions.refreshCsrf.match(action)) {
      yield call(authApi.bootstrap);
      yield put(authActions.csrfReady(true));
      yield put(authActions.refreshed());
    }
  } catch (error) {
    const failure = safeFailure(error);
    if (failure.code === 'CSRF_INVALID' && failure.status === 403) yield put(authActions.csrfReady(false));
    if (action.type === authActions.logout.type && failure.status === 401) yield put(authActions.sessionExpired());
    yield put(authActions.failed(failure));
  }
}
function* watchExpiry(): SagaIterator {
  const channel = eventChannel<boolean>(emit => authApi.onSessionExpired(() => emit(true)));
  try { while (true) { yield take(channel); yield put(authActions.sessionExpired()); } }
  finally { channel.close(); }
}
export default function* authSaga(): SagaIterator {
  yield fork(watchExpiry);
  yield call(restoreSession);
  // Serialize mutations. A second click never cancels/replays an in-flight write.
  yield takeLeading([authActions.login.type, authActions.register.type, authActions.logout.type,
    authActions.refreshCsrf.type], runAuthOperation);
}
