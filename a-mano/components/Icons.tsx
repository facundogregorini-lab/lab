type P = { size?: number };
const base = (size = 24) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true });

export const HomeIcon = ({ size }: P) => (<svg {...base(size)}><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>);
export const StepsIcon = ({ size }: P) => (<svg {...base(size)}><rect x="3.5" y="3.5" width="17" height="17" rx="3" /><path d="m8 12 3 3 5-6" /></svg>);
export const CardIcon = ({ size }: P) => (<svg {...base(size)}><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 10h19" /></svg>);
export const PinIcon = ({ size }: P) => (<svg {...base(size)}><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>);
export const PeopleIcon = ({ size }: P) => (<svg {...base(size)}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" /><path d="M15.5 4.8a3.3 3.3 0 0 1 0 6.4M18 14.8c2 .6 3.2 2.3 3.5 5.2" /></svg>);
export const IdIcon = ({ size }: P) => (<svg {...base(size)}><rect x="2.5" y="4.5" width="19" height="15" rx="2.5" /><circle cx="8.5" cy="10.5" r="2" /><path d="M5.5 16c.5-1.7 1.6-2.5 3-2.5s2.5.8 3 2.5M14 9.5h4.5M14 13h4.5" /></svg>);
export const HealthIcon = ({ size }: P) => (<svg {...base(size)}><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M12 8v8M8 12h8" /></svg>);
export const HouseIcon = ({ size }: P) => (<svg {...base(size)}><path d="M4 11 12 4l8 7" /><path d="M6 10v10h12V10" /><path d="M10 20v-5h4v5" /></svg>);
export const StarIcon = ({ size }: P) => (<svg {...base(size)}><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" /></svg>);
export const WalletIcon = ({ size }: P) => (<svg {...base(size)}><path d="M4 7.5h15a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18V7.5L15 4.5v3" /><circle cx="16.5" cy="13.5" r="1" fill="currentColor" /></svg>);
export const CheckIcon = ({ size }: P) => (<svg {...base(size)}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>);
export const ArrowIcon = ({ size }: P) => (<svg {...base(size)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>);
export const BackIcon = ({ size }: P) => (<svg {...base(size)}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>);

export function StepIcon({ icon, size = 44 }: { icon: string; size?: number }) {
  if (icon === 'id') return <IdIcon size={size} />;
  if (icon === 'health') return <HealthIcon size={size} />;
  if (icon === 'home') return <HouseIcon size={size} />;
  return <StarIcon size={size} />;
}
