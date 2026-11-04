import { configureStore } from '@reduxjs/toolkit';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import authReducer, { authActions, initialState } from 'controllers/feature/auth/authSlice';
import AuthDialog from './index';

function setup(registration = false, extra = {}) {
  const actions: any[] = [];
  const store = configureStore({ reducer: { auth: authReducer },
    preloadedState: { auth: { ...initialState, initializing: false, csrfReady: true, ...extra } },
    middleware: getDefault => getDefault().concat(() => next => action => { actions.push(action); return next(action); }),
  });
  const close = jest.fn();
  render(<Provider store={store}><AuthDialog registration={registration} onClose={close} /></Provider>);
  return { store, close, actions };
}
const enter = (label: string, value: string) => fireEvent.change(screen.getByLabelText(new RegExp('^' + label), { selector: 'input' }), { target: { value } });
test('registration validates Unicode, sends only approved fields and disables duplicate submission', async () => {
  const { actions } = setup(true);
  enter('Full name', '😀'.repeat(50)); enter('Email address', ' TEST@EXAMPLE.COM ');
  enter('Password', '🔐'.repeat(12)); enter('Confirm password', '🔐'.repeat(12));
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
  const action = actions.find(a => a.type === authActions.register.type);
  expect(action.payload).toEqual({ fullName: '😀'.repeat(50), email: 'test@example.com', password: '🔐'.repeat(12) });
  expect(screen.getByRole('button', { name: 'Creating account...' })).toBeDisabled();
  fireEvent.submit(screen.getByRole('form', { name: 'Registration' }));
  expect(actions.filter(a => a.type === authActions.register.type)).toHaveLength(1);
});
test('validation errors are accessible and prevent submission', () => {
  const { actions } = setup(true);
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
  expect(screen.getByText('Full name is required.')).toBeInTheDocument();
  expect(screen.getByLabelText('Full name', { exact: false })).toHaveAttribute('aria-invalid', 'true');
  expect(actions.some(a => a.type === authActions.register.type)).toBe(false);
});
test('post-registration login prefill focuses password and removes Forgotten Password', async () => {
  setup(false, { loginEmail: 'test@example.com', notice: 'Account created successfully. Please log in.' });
  expect(screen.getByLabelText('Email address', { exact: false })).toHaveValue('test@example.com');
  await waitFor(() => expect(screen.getByLabelText('Password', { exact: false, selector: 'input' })).toHaveFocus());
  expect(screen.getByRole('status')).toHaveTextContent('Account created');
  expect(screen.queryByText(/Forgotten Password/)).not.toBeInTheDocument();
});
test('safe error alert clears sensitive input; CSRF recovery is user initiated', async () => {
  const { store, actions } = setup();
  enter('Email address', 'test@example.com'); enter('Password', 'secret');
  act(() => { store.dispatch(authActions.csrfReady(false)); store.dispatch(authActions.failed({ status: 403, code: 'CSRF_INVALID', message: 'Security verification failed.' })); });
  expect(screen.getByRole('alert')).toHaveTextContent('Security verification failed');
  expect(screen.getByLabelText('Password', { exact: false, selector: 'input' })).toHaveValue('');
  expect(screen.getByLabelText('Email address', { exact: false })).toHaveValue('test@example.com');
  fireEvent.click(screen.getByRole('button', { name: 'Refresh security verification' }));
  expect(actions.filter(a => a.type === authActions.refreshCsrf.type)).toHaveLength(1);
  expect(actions.some(a => a.type === authActions.login.type)).toBe(false);
});

test('confirm password visibility is independent', () => {
  setup(true);
  const password = screen.getByLabelText(/^Password/, { selector: 'input' });
  const confirmation = screen.getByLabelText(/^Confirm password/, { selector: 'input' });
  fireEvent.click(screen.getByRole('button', { name: 'Show confirm password' }));
  expect(confirmation).toHaveAttribute('type', 'text'); expect(password).toHaveAttribute('type', 'password');
  fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
  expect(password).toHaveAttribute('type', 'text');
  fireEvent.click(screen.getByRole('button', { name: 'Hide confirm password' }));
  expect(confirmation).toHaveAttribute('type', 'password'); expect(password).toHaveAttribute('type', 'text');
});

test('input edits clear only the relevant stale server error, without erasing newly typed passwords', () => {
  const { store } = setup(true);
  act(() => { store.dispatch(authActions.failed({ message: 'Check fields', fields: { email: 'Email address is required.', fullName: 'Full name is required.' } })); });
  enter('Full name', 'Customer');
  expect(screen.queryByText('Full name is required.')).not.toBeInTheDocument();
  expect(screen.getByText('Email address is required.')).toBeInTheDocument();
  enter('Password', 'new-password-123');
  expect(screen.getByLabelText(/^Password/, { selector: 'input' })).toHaveValue('new-password-123');
  expect(store.getState().auth.error?.fields?.fullName).toBeUndefined();
});

test('409 recovery opens login with attempted normalized email', () => {
  const { store } = setup(true); enter('Email address', ' CUSTOMER@EXAMPLE.COM ');
  act(() => { store.dispatch(authActions.failed({ status: 409, code: 'EMAIL_CONFLICT', message: 'Email unavailable' })); });
  fireEvent.click(screen.getByRole('button', { name: 'Log in instead' }));
  expect(store.getState().auth).toMatchObject({ dialog: 'login', loginEmail: 'customer@example.com' });
});

test('loading feedback appears after three seconds and clears on failure', () => {
  jest.useFakeTimers();
  try {
    const { store } = setup();
    act(() => { store.dispatch(authActions.login({ email: 'test@example.com', password: 'test' })); });
    expect(screen.queryByText('Still working...')).not.toBeInTheDocument();
    act(() => { jest.advanceTimersByTime(3000); });
    expect(screen.getByText('Still working...')).toBeInTheDocument();
    act(() => { store.dispatch(authActions.failed({ message: 'Could not confirm result.' })); });
    expect(screen.queryByText('Still working...')).not.toBeInTheDocument();
  } finally { jest.useRealTimers(); }
});

test('success Snackbar dismisses after 4000ms without dismissing errors', () => {
  jest.useFakeTimers();
  try {
    const { store } = setup(false, { notice: 'Account created successfully. Please log in.' });
    expect(screen.getByRole('status')).toHaveTextContent('Account created');
    act(() => { store.dispatch(authActions.failed({ message: 'Keep this error.' })); jest.advanceTimersByTime(4000); });
    expect(store.getState().auth.notice).toBeUndefined();
    expect(screen.getByRole('alert')).toHaveTextContent('Keep this error.');
  } finally { jest.useRealTimers(); }
});

test('session-expiry warning remains available beyond the success-toast duration', () => {
  jest.useFakeTimers();
  try {
    const { store } = setup(false, { notice: 'Your session has expired.', noticeSeverity: 'warning' });
    act(() => { jest.advanceTimersByTime(5000); });
    expect(screen.getByRole('alert')).toHaveTextContent('Your session has expired.');
    expect(store.getState().auth.notice).toBe('Your session has expired.');
  } finally { jest.useRealTimers(); }
});
