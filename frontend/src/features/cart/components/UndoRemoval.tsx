import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { cartActions } from '../cartSlice';

/** Confirms a removal and offers Undo. Rendered even when the cart became empty, so the last item can be restored. */
export function UndoRemoval({ className = '' }: { className?: string }) {
  const dispatch = useAppDispatch();
  const removed = useAppSelector(state => state.cart.lastRemoved);
  if (!removed) return null;
  return (
    <div role="status" className={`flex items-center justify-between gap-3 rounded-xl bg-linen px-3.5 py-3 text-sm ${className}`}>
      <span>{removed.line.name} removed from your cart.</span>
      <button type="button" onClick={() => dispatch(cartActions.undoRemoval())}
        className="min-h-9 shrink-0 rounded-full bg-stone-900 px-3.5 text-[13px] font-semibold text-white hover:bg-stone-700">Undo</button>
    </div>
  );
}
