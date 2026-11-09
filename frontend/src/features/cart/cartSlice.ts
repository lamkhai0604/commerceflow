import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ServerCart } from '@/features/commerce/types';
import { fromCents, toCents, type Money } from '@/lib/money';

/** Cart lines keep a snapshot of what the customer saw when adding the product. */
export interface CartLine {
  productId: string;
  slug: string;
  name: string;
  unitPrice: Money;
  image: string;
  quantity: number;
  /** Server cart item ID; present while a signed-in customer's cart is kept on the server. */
  itemId?: string;
  /** False when the product can no longer be bought (server cart only). */
  available?: boolean;
}

export interface CartNotice {
  title: string;
  description?: string;
}

export interface CartState {
  lines: CartLine[];
  drawerOpen: boolean;
  /** The most recently removed line, kept so the removal can be undone. Not persisted. */
  lastRemoved?: { line: CartLine; index: number };
  /** True while the lines mirror the signed-in customer's server cart (never persisted in the browser). */
  server?: boolean;
  /** A one-off message for the customer, for example after the browser cart was merged on log-in. */
  notice?: CartNotice;
  /** Shown when a change could not be saved to the server cart; the cart is then reloaded from the server. */
  syncError?: string;
  /** Signed-out customers choose between guest and member checkout (CR-S4-01). */
  checkoutChoice?: 'open' | 'awaitingSignIn';
}

export const MAX_QUANTITY = 10;
export const FREE_SHIPPING_THRESHOLD_CENTS = 7500;
const STORAGE_KEY = 'commerceflow.cart.v1';

export const initialCartState: CartState = { lines: [], drawerOpen: false };

const clamp = (quantity: number) => Math.min(MAX_QUANTITY, Math.max(1, Math.round(quantity)));

const cartSlice = createSlice({
  name: 'cart',
  initialState: initialCartState,
  reducers: {
    added(state, action: PayloadAction<{ line: Omit<CartLine, 'quantity'>; quantity: number }>) {
      state.lastRemoved = undefined;
      const existing = state.lines.find(l => l.productId === action.payload.line.productId);
      if (existing) existing.quantity = clamp(existing.quantity + action.payload.quantity);
      else state.lines.push({ ...action.payload.line, quantity: clamp(action.payload.quantity) });
    },
    quantityChanged(state, action: PayloadAction<{ productId: string; quantity: number }>) {
      const line = state.lines.find(l => l.productId === action.payload.productId);
      if (line) line.quantity = clamp(action.payload.quantity);
    },
    removed(state, action: PayloadAction<string>) {
      const index = state.lines.findIndex(l => l.productId === action.payload);
      if (index < 0) return;
      state.lastRemoved = { line: state.lines[index], index };
      state.lines.splice(index, 1);
    },
    /** Undo for a removal: puts the line back at its previous position. */
    undoRemoval(state) {
      const removed = state.lastRemoved;
      state.lastRemoved = undefined;
      if (!removed || state.lines.some(l => l.productId === removed.line.productId)) return;
      const line = state.server ? { ...removed.line, itemId: undefined } : removed.line;
      state.lines.splice(Math.min(removed.index, state.lines.length), 0, line);
    },
    cleared(state) { state.lines = []; state.lastRemoved = undefined; },
    /** Replaces the lines with the signed-in customer's server cart. */
    serverCartLoaded(state, action: PayloadAction<ServerCart>) {
      state.server = true;
      state.syncError = undefined;
      state.lines = action.payload.items.map(item => ({
        productId: item.productId, slug: item.slug, name: item.name, unitPrice: item.unitPrice, image: item.imageUrl,
        quantity: item.quantity, itemId: item.id, available: item.available,
      }));
    },
    /** After log-out the account's cart stays on the server and is removed from this browser. */
    signedOut(state) {
      if (!state.server) return;
      state.server = false; state.lines = []; state.lastRemoved = undefined; state.syncError = undefined;
    },
    syncFailed(state, action: PayloadAction<string>) { state.syncError = action.payload; },
    syncErrorDismissed(state) { state.syncError = undefined; },
    noticeShown(state, action: PayloadAction<CartNotice>) { state.notice = action.payload; },
    noticeCleared(state) { state.notice = undefined; },
    checkoutChoiceOpened(state) { state.checkoutChoice = 'open'; state.drawerOpen = false; },
    checkoutChoiceClosed(state) { state.checkoutChoice = undefined; },
    /** The customer chose to log in or create an account first; checkout continues once they are signed in. */
    checkoutAwaitingSignIn(state) { state.checkoutChoice = 'awaitingSignIn'; },
    drawerOpened(state) { state.drawerOpen = true; },
    drawerClosed(state) { state.drawerOpen = false; },
  },
});

export const cartActions = cartSlice.actions;
export default cartSlice.reducer;

type WithCart = { cart: CartState };
export const selectCartLines = (state: WithCart) => state.cart.lines;
export const selectCartCount = (state: WithCart) => state.cart.lines.reduce((sum, l) => sum + l.quantity, 0);
export const selectSubtotalCents = (state: WithCart) => state.cart.lines.reduce((sum, l) => sum + toCents(l.unitPrice) * l.quantity, 0);
export const lineTotal = (line: CartLine): Money => fromCents(toCents(line.unitPrice) * line.quantity);

/** Reads a saved cart. Storage can be unavailable (private mode, blocked site data); the cart then starts empty. */
export function loadCart(): CartState {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (!Array.isArray(saved?.lines)) return initialCartState;
    const lines = saved.lines.filter((l: Partial<CartLine>) => typeof l?.productId === 'string' && typeof l.name === 'string'
      && typeof l.slug === 'string' && typeof l.image === 'string' && typeof l.unitPrice === 'string'
      && /^\d+\.\d{2}$/.test(l.unitPrice) && Number.isInteger(l.quantity) && l.quantity! >= 1);
    return { lines: lines.map((l: CartLine) => ({ ...l, quantity: clamp(l.quantity) })), drawerOpen: false };
  } catch {
    return initialCartState;
  }
}

/** Only a signed-out visitor's cart is kept in the browser; a member's cart lives on the server. */
export function saveCart(state: CartState) {
  try {
    const lines = state.server ? [] : state.lines.map(({ itemId: _itemId, available: _available, ...line }) => line);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ lines }));
  }
  catch { /* Storage unavailable: the cart still works for this visit. */ }
}
