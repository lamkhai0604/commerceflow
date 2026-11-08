import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { fromCents, toCents, type Money } from '@/lib/money';

/** Cart lines keep a snapshot of what the customer saw when adding the product. */
export interface CartLine {
  productId: string;
  slug: string;
  name: string;
  unitPrice: Money;
  image: string;
  quantity: number;
}

export interface CartState {
  lines: CartLine[];
  drawerOpen: boolean;
  /** The most recently removed line, kept so the removal can be undone. Not persisted. */
  lastRemoved?: { line: CartLine; index: number };
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
      state.lines.splice(Math.min(removed.index, state.lines.length), 0, removed.line);
    },
    cleared(state) { state.lines = []; state.lastRemoved = undefined; },
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

export function saveCart(state: CartState) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ lines: state.lines })); }
  catch { /* Storage unavailable: the cart still works for this visit. */ }
}
