import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import { rootReducer } from '@/app/rootReducer';
import { authActions, initialState as authInitial } from '@/features/auth/authSlice';
import commerceApi from '@/features/commerce/commerceApi';
import type { ServerCart } from '@/features/commerce/types';
import { member, mugLine } from '@/test/orderFixtures';
import cartSaga from './cartSaga';
import { cartActions, initialCartState, saveCart, type CartLine } from './cartSlice';

vi.mock('@/features/commerce/commerceApi', () => ({
  default: { clearCsrf: vi.fn(), cart: vi.fn(), addItem: vi.fn(), setQuantity: vi.fn(), removeItem: vi.fn(), merge: vi.fn() },
}));
const api = vi.mocked(commerceApi);
beforeEach(() => vi.resetAllMocks());

const serverCart = (lines: Array<Partial<CartLine> & { quantity: number }>): ServerCart => ({
  currency: 'USD', estimatedTotal: '0.00',
  items: lines.map((l, i) => ({ id: `item-${i}`, productId: l.productId ?? mugLine.productId, slug: mugLine.slug, name: mugLine.name,
    imageUrl: mugLine.image, unitPrice: '18.00', quantity: l.quantity, lineTotal: '0.00', available: true })),
});

function setup(lines: CartLine[] = []) {
  const saga = createSagaMiddleware();
  const store = configureStore({
    reducer: rootReducer,
    preloadedState: { auth: { ...authInitial, initializing: false }, cart: { ...initialCartState, lines } },
    middleware: d => d({ thunk: false }).concat(saga),
  });
  saga.run(cartSaga);
  return store;
}
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

test('log-in merges the browser cart into the account cart and tells the customer', async () => {
  api.merge.mockResolvedValueOnce({ cart: serverCart([{ quantity: 10 }]), skippedProductIds: ['gone'] });
  const store = setup([{ ...mugLine, quantity: 4 }, { ...mugLine, productId: 'gone', quantity: 1 }]);
  store.dispatch(authActions.loginSuccess(member));
  await settle();
  expect(api.merge).toHaveBeenCalledWith([{ productId: mugLine.productId, quantity: 4 }, { productId: 'gone', quantity: 1 }]);
  const { cart } = store.getState();
  expect(cart.server).toBe(true);
  expect(cart.lines).toEqual([expect.objectContaining({ productId: mugLine.productId, quantity: 10, itemId: 'item-0' })]);
  expect(cart.notice?.title).toBe('Your cart was saved to your account');
  expect(cart.notice?.description).toMatch(/1 item from this browser was added.*1 unavailable item was left out/);
});

test('restoring a signed-in session with an empty browser cart just loads the account cart', async () => {
  api.cart.mockResolvedValueOnce(serverCart([{ quantity: 2 }]));
  const store = setup();
  store.dispatch(authActions.restored(member));
  await settle();
  expect(api.merge).not.toHaveBeenCalled();
  expect(store.getState().cart.lines[0].quantity).toBe(2);
  expect(store.getState().cart.notice).toBeUndefined();
});

test('a failed merge keeps the browser cart and says so', async () => {
  api.merge.mockRejectedValueOnce({ status: 500 });
  const store = setup([mugLine]);
  store.dispatch(authActions.loginSuccess(member));
  await settle();
  expect(store.getState().cart.lines).toEqual([mugLine]);
  expect(store.getState().cart.server).toBeFalsy();
  expect(store.getState().cart.syncError).toMatch(/could not load your saved cart/);
});

test('member cart changes are saved in order; removal and undo use server item IDs', async () => {
  api.cart.mockResolvedValueOnce(serverCart([{ quantity: 2 }]));
  const store = setup();
  store.dispatch(authActions.restored(member));
  await settle();
  api.setQuantity.mockResolvedValueOnce(serverCart([{ quantity: 5 }]));
  api.removeItem.mockResolvedValueOnce(serverCart([]));
  api.addItem.mockResolvedValueOnce(serverCart([{ quantity: 5 }]));
  store.dispatch(cartActions.quantityChanged({ productId: mugLine.productId, quantity: 5 }));
  store.dispatch(cartActions.removed(mugLine.productId));
  store.dispatch(cartActions.undoRemoval());
  await settle(); await settle();
  expect(api.setQuantity).toHaveBeenCalledWith('item-0', 5);
  expect(api.removeItem).toHaveBeenCalledWith('item-0');
  expect(api.addItem).toHaveBeenCalledWith({ productId: mugLine.productId, quantity: 5 });
  expect(store.getState().cart.lines).toEqual([expect.objectContaining({ quantity: 5, itemId: 'item-0' })]);
});

test('a change the server rejects reloads the account cart and shows an error', async () => {
  api.cart.mockResolvedValueOnce(serverCart([{ quantity: 2 }])).mockResolvedValueOnce(serverCart([{ quantity: 2 }]));
  const store = setup();
  store.dispatch(authActions.restored(member));
  await settle();
  api.addItem.mockRejectedValueOnce({ status: 409, code: 'PRODUCT_UNAVAILABLE' });
  store.dispatch(cartActions.added({ line: mugLine, quantity: 1 }));
  expect(store.getState().cart.lines[0].quantity).toBe(3);
  await settle(); await settle();
  expect(store.getState().cart.lines[0].quantity).toBe(2);
  expect(store.getState().cart.syncError).toMatch(/could not save that change/);
});

test('guest cart changes stay in the browser; log-out removes the account cart from the browser', async () => {
  const store = setup();
  store.dispatch(cartActions.added({ line: mugLine, quantity: 1 }));
  await settle();
  expect(api.addItem).not.toHaveBeenCalled();

  api.cart.mockResolvedValueOnce(serverCart([{ quantity: 2 }]));
  api.merge.mockResolvedValueOnce({ cart: serverCart([{ quantity: 3 }]), skippedProductIds: [] });
  store.dispatch(authActions.loginSuccess(member));
  await settle();
  const setItem = vi.spyOn(Storage.prototype, 'setItem');
  saveCart(store.getState().cart);
  expect(JSON.parse(setItem.mock.calls[0][1])).toEqual({ lines: [] });
  setItem.mockRestore();

  store.dispatch(authActions.loggedOut());
  await settle();
  expect(store.getState().cart).toMatchObject({ lines: [], server: false });
});
