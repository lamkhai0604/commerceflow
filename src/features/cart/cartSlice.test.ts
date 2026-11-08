import reducer, { cartActions, initialCartState, loadCart, saveCart, selectCartCount, selectSubtotalCents, type CartLine } from './cartSlice';

const mug = { productId: 'mug', slug: 'stoneware-mug', name: 'Stoneware Mug', unitPrice: '18.00', image: '/images/products/stoneware-mug' };
const vase = { productId: 'vase', slug: 'stoneware-vase-cream', name: 'Stoneware Vase, Cream', unitPrice: '68.00', image: '/images/products/stoneware-vase-cream' };

test('adding the same product merges lines and caps the quantity at ten', () => {
  let state = reducer(initialCartState, cartActions.added({ line: mug, quantity: 2 }));
  state = reducer(state, cartActions.added({ line: mug, quantity: 3 }));
  expect(state.lines).toEqual([{ ...mug, quantity: 5 }]);
  state = reducer(state, cartActions.added({ line: mug, quantity: 50 }));
  expect(state.lines[0].quantity).toBe(10);
});

test('quantity changes stay within 1 to 10, and totals use exact cents', () => {
  let state = reducer(initialCartState, cartActions.added({ line: mug, quantity: 1 }));
  state = reducer(state, cartActions.added({ line: vase, quantity: 1 }));
  state = reducer(state, cartActions.quantityChanged({ productId: 'mug', quantity: 0 }));
  expect(state.lines[0].quantity).toBe(1);
  state = reducer(state, cartActions.quantityChanged({ productId: 'mug', quantity: 3 }));
  expect(selectCartCount({ cart: state })).toBe(4);
  expect(selectSubtotalCents({ cart: state })).toBe(3 * 1800 + 6800);
});

test('a removed line can be restored to its previous position once', () => {
  let state = reducer(initialCartState, cartActions.added({ line: mug, quantity: 1 }));
  state = reducer(state, cartActions.added({ line: vase, quantity: 2 }));
  state = reducer(state, cartActions.removed('mug'));
  expect(state.lines.map(l => l.productId)).toEqual(['vase']);
  expect(state.lastRemoved).toEqual({ line: { ...mug, quantity: 1 }, index: 0 });
  state = reducer(state, cartActions.undoRemoval());
  state = reducer(state, cartActions.undoRemoval());
  expect(state.lines.map(l => l.productId)).toEqual(['mug', 'vase']);
  expect(state.lastRemoved).toBeUndefined();
});

test('saved carts are reloaded, malformed lines are dropped and the drawer starts closed', () => {
  const valid: CartLine = { ...mug, quantity: 2 };
  saveCart({ lines: [valid], drawerOpen: true });
  expect(loadCart()).toEqual({ lines: [valid], drawerOpen: false });
  window.localStorage.setItem('commerceflow.cart.v1', JSON.stringify({ lines: [valid, { productId: 'x', unitPrice: '1' }, null] }));
  expect(loadCart().lines).toEqual([valid]);
  window.localStorage.setItem('commerceflow.cart.v1', '{not json');
  expect(loadCart()).toEqual(initialCartState);
});

test('unavailable storage never breaks the cart', () => {
  const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  expect(loadCart()).toEqual(initialCartState);
  expect(() => saveCart({ lines: [{ ...mug, quantity: 1 }], drawerOpen: false })).not.toThrow();
  get.mockRestore(); set.mockRestore();
});
