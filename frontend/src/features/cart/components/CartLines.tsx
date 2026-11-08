import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { formatMoney } from '@/lib/money';
import { cartActions, lineTotal, MAX_QUANTITY, selectCartLines } from '../cartSlice';
import { UndoRemoval } from './UndoRemoval';

interface CartLinesProps {
  /** Called when the customer follows a product link, for example to close the drawer. */
  onNavigate?: () => void;
  imageSize?: 'sm' | 'md';
}

/** Cart lines with quantity controls. Removal is reversible, so it offers Undo instead of a confirmation step. */
export function CartLines({ onNavigate, imageSize = 'sm' }: CartLinesProps) {
  const dispatch = useAppDispatch();
  const lines = useAppSelector(selectCartLines);
  const image = imageSize === 'md' ? 'h-32 w-26' : 'h-26 w-22';

  return (
    <>
      <ul className="divide-y divide-stone-200">
        {lines.map(line => (
          <li key={line.productId} className="flex gap-4 py-4.5">
            <Link to={`/products/${line.slug}`} onClick={onNavigate} tabIndex={-1} aria-hidden="true" className="shrink-0">
              <img src={`${line.image}-480.webp`} alt="" className={`${image} rounded-xl bg-linen object-cover`} />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex justify-between gap-3">
                <Link to={`/products/${line.slug}`} onClick={onNavigate} className="text-[15px] font-semibold text-stone-900 hover:underline">{line.name}</Link>
                <span className="text-[15px] font-semibold">{formatMoney(lineTotal(line))}</span>
              </div>
              {line.quantity > 1 && <span className="mt-0.5 text-sm text-stone-600">{formatMoney(line.unitPrice)} each</span>}
              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
                <QuantityStepper label={`Quantity, ${line.name}`} value={line.quantity} max={MAX_QUANTITY}
                  onChange={quantity => dispatch(cartActions.quantityChanged({ productId: line.productId, quantity }))} />
                <button type="button" onClick={() => dispatch(cartActions.removed(line.productId))} aria-label={`Remove ${line.name}`}
                  className="min-h-10 text-sm text-stone-600 underline underline-offset-4 hover:text-stone-900">Remove</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <UndoRemoval className="mt-4" />
    </>
  );
}
