import { MinusIcon, PlusIcon } from '@/components/icons';
import { cn } from '@/lib/cn';

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  /** Accessible group name, for example "Quantity, Stoneware Mug". */
  label: string;
  min?: number;
  max?: number;
  size?: 'md' | 'lg';
  disabled?: boolean;
}

export function QuantityStepper({ value, onChange, label, min = 1, max = 10, size = 'md', disabled }: QuantityStepperProps) {
  const button = cn('flex items-center justify-center text-stone-900 disabled:text-stone-400 disabled:cursor-not-allowed',
    size === 'lg' ? 'h-[50px] w-12' : 'h-[38px] w-10');
  return (
    <div role="group" aria-label={label}
      className={cn('inline-flex items-center rounded-full border border-stone-300', size === 'lg' ? 'h-13' : 'h-10')}>
      <button type="button" className={button} aria-label="Decrease quantity"
        disabled={disabled || value <= min} onClick={() => onChange(value - 1)}>
        <MinusIcon size={16} />
      </button>
      <output aria-live="polite" className="min-w-6 text-center text-[15px] font-semibold">{value}</output>
      <button type="button" className={button} aria-label="Increase quantity"
        disabled={disabled || value >= max} onClick={() => onChange(value + 1)}>
        <PlusIcon size={16} />
      </button>
    </div>
  );
}
