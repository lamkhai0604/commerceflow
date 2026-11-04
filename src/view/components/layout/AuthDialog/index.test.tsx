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
