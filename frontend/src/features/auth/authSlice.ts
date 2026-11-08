import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/app/store';
import { AuthField, AuthFailure, LoginPayload, RegisterPayload, UserProfile } from './authModels';
export type { LoginPayload } from './authModels';

export interface AuthState {
  isLoggedIn: boolean;
  initializing: boolean;
  pending?: 'login' | 'register' | 'logout' | 'refresh';
  currentUser?: UserProfile;
  error?: AuthFailure;
  errorVersion: number;
  notice?: string;
  noticeSeverity?: 'success' | 'warning' | 'info';
  loginEmail?: string;
  dialog?: 'login' | 'register';
  csrfReady: boolean;
}
export const initialState: AuthState = { isLoggedIn: false, initializing: true, csrfReady: false, errorVersion: 0 };
const authSlice = createSlice({ name: 'auth', initialState, reducers: {
  login(state, _action: PayloadAction<LoginPayload>) { state.pending = 'login'; state.error = undefined; state.notice = undefined; },
  register(state, _action: PayloadAction<RegisterPayload>) { state.pending = 'register'; state.error = undefined; },
  logout(state) { state.pending = 'logout'; state.error = undefined; state.notice = undefined; },
  refreshCsrf(state) { state.pending = 'refresh'; state.error = undefined; },
  securitySettled(state) { state.pending = undefined; },
  csrfReady(state, action: PayloadAction<boolean>) { state.csrfReady = action.payload; },
  restored(state, action: PayloadAction<UserProfile | undefined>) {
    state.initializing = false; state.currentUser = action.payload; state.isLoggedIn = !!action.payload;
  },
  loginSuccess(state, action: PayloadAction<UserProfile>) {
    state.currentUser = action.payload; state.isLoggedIn = true;
    state.pending = 'refresh'; state.dialog = undefined; state.notice = 'You have successfully logged in.'; state.noticeSeverity = 'success';
  },
  registered(state, action: PayloadAction<string>) {
    state.pending = undefined; state.dialog = 'login'; state.loginEmail = action.payload;
    state.notice = 'Account created successfully. Please log in.'; state.noticeSeverity = 'success';
  },
  loggedOut(state) {
    state.currentUser = undefined; state.isLoggedIn = false;
    state.pending = 'refresh'; state.notice = 'You have successfully logged out.'; state.noticeSeverity = 'success';
  },
  failed(state, action: PayloadAction<AuthFailure>) { state.pending = undefined; state.error = action.payload; state.errorVersion += 1; },
  refreshed(state) { state.pending = undefined; state.notice = 'Security verification refreshed. Please submit again.'; state.noticeSeverity = 'info'; },
  sessionExpired(state) {
    const wasAuthenticated = state.isLoggedIn;
    state.currentUser = undefined; state.isLoggedIn = false; state.csrfReady = false;
    if (wasAuthenticated) { state.dialog = 'login'; state.notice = 'Your session has expired. Please log in again.'; state.noticeSeverity = 'warning'; }
  },
  openDialog(state, action: PayloadAction<'login' | 'register'>) {
    state.dialog = action.payload; state.error = undefined; state.notice = undefined;
  },
  prefillLogin(state, action: PayloadAction<string>) {
    state.dialog = 'login'; state.loginEmail = action.payload; state.error = undefined; state.notice = undefined;
  },
  closeDialog(state) { if (!state.pending) { state.dialog = undefined; state.error = undefined; state.notice = undefined; } },
  clearFieldError(state, action: PayloadAction<AuthField>) {
    if (state.error?.fields) delete state.error.fields[action.payload];
  },
  dismissNotice(state) { state.notice = undefined; },
  dismissFeedback(state) { state.error = undefined; state.notice = undefined; },
} });
export const authActions = authSlice.actions;
export const selectIsLoggedIn = (state: RootState) => state.auth.isLoggedIn;
export const selectIsLogging = (state: RootState) => state.auth.pending === 'login';
export const currentUser = (state: RootState) => state.auth.currentUser;
export default authSlice.reducer;
