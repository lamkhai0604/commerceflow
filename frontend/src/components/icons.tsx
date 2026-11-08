import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 20, children, ...props }: IconProps) {
  return (
    <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      {children}
    </svg>
  );
}

export const SearchIcon = (p: IconProps) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Icon>;
export const BagIcon = (p: IconProps) => <Icon {...p}><path d="M5 8h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 8Z" /><path d="M9 8V7a3 3 0 0 1 6 0v1" /></Icon>;
export const UserIcon = (p: IconProps) => <Icon {...p}><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" /></Icon>;
export const MenuIcon = (p: IconProps) => <Icon {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Icon>;
export const CloseIcon = (p: IconProps) => <Icon strokeWidth={2.2} {...p}><path d="M6 6l12 12M18 6 6 18" /></Icon>;
export const CheckIcon = (p: IconProps) => <Icon strokeWidth={2.2} {...p}><path d="m5 12 4.5 4.5L19 7" /></Icon>;
export const AlertCircleIcon = (p: IconProps) => <Icon strokeWidth={2.2} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16.5v.5" /></Icon>;
export const WarningIcon = (p: IconProps) => <Icon strokeWidth={2.2} {...p}><path d="M12 4 2.5 20h19L12 4Z" /><path d="M12 10v4M12 17v.5" /></Icon>;
export const InfoIcon = (p: IconProps) => <Icon strokeWidth={2.2} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5V8" /></Icon>;
export const ChevronLeftIcon = (p: IconProps) => <Icon strokeWidth={2} {...p}><path d="m15 6-6 6 6 6" /></Icon>;
export const ChevronRightIcon = (p: IconProps) => <Icon strokeWidth={2} {...p}><path d="m9 6 6 6-6 6" /></Icon>;
export const ChevronDownIcon = (p: IconProps) => <Icon strokeWidth={2} {...p}><path d="m6 9 6 6 6-6" /></Icon>;
export const MinusIcon = (p: IconProps) => <Icon strokeWidth={2} {...p}><path d="M5 12h14" /></Icon>;
export const PlusIcon = (p: IconProps) => <Icon strokeWidth={2} {...p}><path d="M12 5v14M5 12h14" /></Icon>;
export const TruckIcon = (p: IconProps) => <Icon {...p}><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></Icon>;
export const ReturnIcon = (p: IconProps) => <Icon {...p}><path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4" /></Icon>;
export const LockIcon = (p: IconProps) => <Icon {...p}><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></Icon>;
export const SpinnerIcon = (p: IconProps) => <Icon strokeWidth={2.4} {...p}><path d="M12 3a9 9 0 1 0 9 9" /></Icon>;

export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="8" fill="#1f4d3f" />
      <path d="M21.5 11.2A7 7 0 1 0 21.5 20.8" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <circle cx="22" cy="16" r="2" fill="#e9c46a" />
    </svg>
  );
}
