import { Action, configureStore, ThunkAction } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import { sanitizeAuthAction } from '@/features/auth/authDevTools';
import { loadCart, saveCart } from '@/features/cart/cartSlice';
import { rootReducer, type RootState } from './rootReducer';
import rootSaga from './rootSaga';

const sagaMiddleware = createSagaMiddleware();

export const store = configureStore({
  reducer: rootReducer,
  preloadedState: { cart: loadCart() },
  devTools: import.meta.env.DEV ? {
    // Credential actions must never be retained in Redux DevTools history.
    actionSanitizer: sanitizeAuthAction,
  } : false,
  middleware: getDefaultMiddleware => getDefaultMiddleware({ thunk: false }).concat(sagaMiddleware),
});

sagaMiddleware.run(rootSaga);

// Only the cart is persisted. Authentication state is never written to browser storage.
let saved = store.getState().cart;
store.subscribe(() => {
  const { cart } = store.getState();
  if (cart.lines !== saved.lines || cart.server !== saved.server) { saved = cart; saveCart(cart); }
});

export type AppDispatch = typeof store.dispatch;
export type { RootState };
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, unknown, Action<string>>;
