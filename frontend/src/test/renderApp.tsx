import { configureStore } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '@/components/ui/Toast';
import { initialState as authInitial, type AuthState } from '@/features/auth/authSlice';
import { initialCartState, type CartState } from '@/features/cart/cartSlice';
import { rootReducer } from '@/app/rootReducer';
import App from '@/app/App';

/** A store with the real reducers but no sagas or network: authentication starts settled and signed out. */
export function makeStore(cart: Partial<CartState> = {}, auth: Partial<AuthState> = {}) {
  return configureStore({
    reducer: rootReducer,
    preloadedState: {
      auth: { ...authInitial, initializing: false, csrfReady: true, ...auth },
      cart: { ...initialCartState, ...cart },
    },
  });
}

/** Renders the whole application at `path`. */
export function renderApp(path: string, cart?: Partial<CartState>, auth?: Partial<AuthState>) {
  const store = makeStore(cart, auth);
  const view = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}><App /></MemoryRouter>
    </Provider>,
  );
  return { store, ...view };
}

/** Renders one component with store, router and toasts. */
export function renderWithProviders(ui: ReactNode, { path = '/', cart }: { path?: string; cart?: Partial<CartState> } = {}) {
  const store = makeStore(cart);
  const view = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <ToastProvider><Routes><Route path="*" element={ui} /></Routes></ToastProvider>
      </MemoryRouter>
    </Provider>,
  );
  return { store, ...view };
}
