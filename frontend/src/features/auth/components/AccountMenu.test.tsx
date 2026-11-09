import { configureStore } from '@reduxjs/toolkit';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import authReducer, { authActions, initialState } from '@/features/auth/authSlice';
import AccountMenu from './AccountMenu';
function setup(auth = initialState) {
  const store = configureStore({ reducer: { auth: authReducer }, preloadedState: { auth } });
  render(<Provider store={store}><MemoryRouter><AccountMenu /></MemoryRouter></Provider>); return store;
}
test('startup uses a quiet session placeholder then accessible account menu', () => {
  const store = setup(); expect(screen.getByLabelText('Checking your session')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  act(() => { store.dispatch(authActions.restored(undefined)); });
  fireEvent.click(screen.getByRole('button', { name: 'Account menu' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Create account' }));
  expect(screen.getByRole('dialog')).toHaveAccessibleName('Create your CommerceFlow account');
});
test('logout pending keeps identity until confirmation and exposes loading feedback', () => {
  const store = setup({ ...initialState, initializing: false, isLoggedIn: true,
    currentUser: { id: 'id', fullName: 'Customer', email: 'test@example.com', roles: ['CUSTOMER'] } });
  fireEvent.click(screen.getByRole('button', { name: 'Account menu' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Log out' }));
  expect(screen.getByText('Logging out...')).toBeInTheDocument();
  expect(store.getState().auth.isLoggedIn).toBe(true);
  act(() => { store.dispatch(authActions.failed({ message: 'Could not confirm logout.' })); });
  expect(screen.getByRole('alert')).toHaveTextContent('Could not confirm logout');
  expect(store.getState().auth.isLoggedIn).toBe(true);
});
