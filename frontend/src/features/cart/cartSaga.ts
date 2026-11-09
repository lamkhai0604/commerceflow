import type { AnyAction } from 'redux';
import { buffers, channel, type Channel, type SagaIterator } from 'redux-saga';
import { call, fork, put, select, take, takeEvery } from 'redux-saga/effects';
import { authActions } from '@/features/auth/authSlice';
import commerceApi from '@/features/commerce/commerceApi';
import type { Line, MergeResult, ServerCart } from '@/features/commerce/types';
import { cartActions, type CartState } from './cartSlice';

type WithState = { cart: CartState; auth: { isLoggedIn: boolean } };
const cartState = (state: WithState) => state.cart;
const signedIn = (state: WithState) => state.auth.isLoggedIn;

const SYNC_ERROR = 'We could not save that change to your cart. Your cart has been reloaded.';
const LOAD_ERROR = 'We could not load your saved cart. Please refresh the page to try again.';

/**
 * After log-in (or when a signed-in session is restored), the browser cart is merged into the account's cart:
 * quantities are added up and capped at 10, and the customer is told what happened (CR-S4-01).
 */
export function* loadMemberCart(): SagaIterator {
  commerceApi.clearCsrf();
  const { lines }: CartState = yield select(cartState);
  try {
    if (lines.length === 0) {
      const cart: ServerCart = yield call(commerceApi.cart);
      yield put(cartActions.serverCartLoaded(cart));
      return;
    }
    const result: MergeResult = yield call(commerceApi.merge, lines.map(l => ({ productId: l.productId, quantity: l.quantity })));
    yield put(cartActions.serverCartLoaded(result.cart));
    const count = lines.length - result.skippedProductIds.length;
    yield put(cartActions.noticeShown({
      title: count > 0 ? 'Your cart was saved to your account' : 'Some items could not be added',
      description: [
        count > 0 && `${count} ${count === 1 ? 'item' : 'items'} from this browser ${count === 1 ? 'was' : 'were'} added to your account cart (up to 10 of each product).`,
        result.skippedProductIds.length > 0 && `${result.skippedProductIds.length} unavailable ${result.skippedProductIds.length === 1 ? 'item was' : 'items were'} left out.`,
      ].filter(Boolean).join(' '),
    }));
  } catch {
    // The browser cart is kept as it is, so nothing the customer chose is lost.
    yield put(cartActions.syncFailed(LOAD_ERROR));
  }
}

function* reload(): SagaIterator {
  try {
    const cart: ServerCart = yield call(commerceApi.cart);
    yield put(cartActions.serverCartLoaded(cart));
  } catch { /* Keep what is shown; the error message below asks the customer to refresh. */ }
}

/** A cart change together with the server item ID it refers to, captured when the change was made. */
export interface CartChange { action: AnyAction; itemId?: string; line?: Line }

/** Saves one cart change of a signed-in customer and shows the server's view of the cart afterwards. */
export function* saveChange({ action, itemId, line }: CartChange, applyResult = true): SagaIterator {
  try {
    let cart: ServerCart;
    if (cartActions.added.match(action)) {
      cart = yield call(commerceApi.addItem, { productId: action.payload.line.productId, quantity: action.payload.quantity });
    } else if (cartActions.quantityChanged.match(action)) {
      cart = itemId ? yield call(commerceApi.setQuantity, itemId, action.payload.quantity) : yield call(commerceApi.cart);
    } else if (cartActions.removed.match(action)) {
      cart = itemId ? yield call(commerceApi.removeItem, itemId) : yield call(commerceApi.cart);
    } else {
      // Undo: the line that was put back is re-created on the server.
      cart = line ? yield call(commerceApi.addItem, line) : yield call(commerceApi.cart);
    }
    // While more changes are waiting, the customer's latest view is kept; the last response shows the final cart.
    if (applyResult) yield put(cartActions.serverCartLoaded(cart));
  } catch {
    yield call(reload);
    yield put(cartActions.syncFailed(SYNC_ERROR));
  }
}

/**
 * Cart changes are saved one at a time, in the order the customer made them. The server item ID is read when the
 * change is made, because later changes (an undo, for example) may already have updated the cart when it is saved.
 */
function* watchChanges(): SagaIterator {
  const queue: Channel<CartChange> = yield call(channel, buffers.expanding<CartChange>(20));
  let pending = 0;
  yield takeEvery([cartActions.added.type, cartActions.quantityChanged.type, cartActions.removed.type, cartActions.undoRemoval.type],
    function* capture(action: AnyAction): SagaIterator {
      const state: CartState = yield select(cartState);
      if (!state.server || !(yield select(signedIn))) return;
      let itemId: string | undefined;
      if (cartActions.quantityChanged.match(action)) itemId = state.lines.find(l => l.productId === action.payload.productId)?.itemId;
      if (cartActions.removed.match(action) && state.lastRemoved?.line.productId === action.payload) itemId = state.lastRemoved.line.itemId;
      const restored = cartActions.undoRemoval.match(action) ? state.lines.find(l => !l.itemId) : undefined;
      pending += 1;
      yield put(queue, { action, itemId, line: restored && { productId: restored.productId, quantity: restored.quantity } });
    });
  while (true) {
    const change: CartChange = yield take(queue);
    yield call(saveChange, change, pending === 1);
    pending -= 1;
  }
}

function* onRestored(action: ReturnType<typeof authActions.restored>): SagaIterator {
  if (action.payload) yield call(loadMemberCart);
}

function* onSignedOut(): SagaIterator {
  commerceApi.clearCsrf();
  yield put(cartActions.signedOut());
}

export default function* cartSaga(): SagaIterator {
  yield fork(watchChanges);
  yield takeEvery(authActions.restored.type, onRestored);
  yield takeEvery(authActions.loginSuccess.type, loadMemberCart);
  yield takeEvery([authActions.loggedOut.type, authActions.sessionExpired.type], onSignedOut);
}
