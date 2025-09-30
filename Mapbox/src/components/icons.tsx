import React from 'react';

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };
const sz = (s?: number) => (s ? s : 20);

export const PlusIcon = ({ size, ...props }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width={sz(size)} height={sz(size)} {...props}>
    <path d="M12 4v16M4 12h16" />
  </svg>
);

export const MinusIcon = ({ size, ...props }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width={sz(size)} height={sz(size)} {...props}>
    <path d="M5 12h14" />
  </svg>
);

export const ArrowsPointingOutIcon = ({ size, ...props }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width={sz(size)} height={sz(size)} {...props}>
    <path d="M4 9V4h5" />
    <path d="M20 9V4h-5" />
    <path d="M4 15v5h5" />
    <path d="M20 15v5h-5" />
  </svg>
);

export const ArrowsPointingInIcon = ({ size, ...props }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width={sz(size)} height={sz(size)} {...props}>
    <path d="M9 4H4v5" />
    <path d="M15 4h5v5" />
    <path d="M9 20H4v-5" />
    <path d="M20 20h-5v-5" />
  </svg>
);

export const Squares2X2Icon = ({ size, ...props }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width={sz(size)} height={sz(size)} {...props}>
    <rect x="4" y="4" width="7" height="7" rx="1" />
    <rect x="13" y="4" width="7" height="7" rx="1" />
    <rect x="4" y="13" width="7" height="7" rx="1" />
    <rect x="13" y="13" width="7" height="7" rx="1" />
  </svg>
);

export const ArrowDownTrayIcon = ({ size, ...props }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width={sz(size)} height={sz(size)} {...props}>
    <path d="M12 3v10" />
    <path d="M8 9l4 4 4-4" />
    <rect x="4" y="17" width="16" height="4" rx="1" />
  </svg>
);

export const ArrowUpTrayIcon = ({ size, ...props }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width={sz(size)} height={sz(size)} {...props}>
    <path d="M12 21V11" />
    <path d="M8 15l4 4 4-4" transform="rotate(180 12 12)" />
    <rect x="4" y="3" width="16" height="4" rx="1" />
  </svg>
);

export const TrashIcon = ({ size, ...props }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width={sz(size)} height={sz(size)} {...props}>
    <path d="M3 6h18" />
    <path d="M8 6v-2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

export const PencilSquareIcon = ({ size, ...props }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width={sz(size)} height={sz(size)} {...props}>
    <rect x="3" y="3" width="14" height="14" rx="2" />
    <path d="M14.5 4.5l5 5" />
    <path d="M8 16l3.5-.5 7-7-2.5-2.5-7 7L8 16z" fill="currentColor" stroke="none" />
  </svg>
);
