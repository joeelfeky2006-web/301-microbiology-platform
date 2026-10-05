const PULSE = 'M2 13 H6 L9.5 6 L12.5 10 L16 3 L19 17 L20.5 13 L22.5 9.5 L24.5 13 H28';

/** "First Pulse" badge for beta students; the mini trace is the brand ECG + Giza line. */
export default function FirstPulseBadge({ size = 'md', className = '' }: { size?: 'sm' | 'md'; className?: string }) {
  const small = size === 'sm';
  return (
    <span
      title="First Pulse: joined MedAtlas Egypt during the beta"
      className={`inline-flex w-fit items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-nile to-brand-indigo font-bold text-white shadow-sm shadow-brand-nile/25 ${small ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1.5 text-xs'} ${className}`}
    >
      <svg viewBox="0 0 30 20" className={small ? 'h-2.5 w-4' : 'h-3.5 w-5'} aria-hidden>
        <path d={PULSE} fill="none" stroke="#21E3C0" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      First Pulse
    </span>
  );
}
