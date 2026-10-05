import { useId } from 'react';

/** Atlas Credits coin: the brand AI spark on the blue gradient disc. */
export default function AtlasCoin({ className = 'h-4 w-4' }: { className?: string }) {
  const gradient = `atlas-coin-${useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 128 128" className={className} aria-hidden>
      <defs>
        <linearGradient id={gradient} x1="0" y1="128" x2="128" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2350FF" />
          <stop offset="1" stopColor="#5B3DF5" />
        </linearGradient>
      </defs>
      <circle cx="64" cy="64" r="60" fill={`url(#${gradient})`} />
      <circle cx="64" cy="64" r="49" fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={5} />
      <path d="M64 34 C72.1 55.9 72.1 55.9 94 64 C72.1 72.1 72.1 72.1 64 94 C55.9 72.1 55.9 72.1 34 64 C55.9 55.9 55.9 55.9 64 34 Z" fill="#21E3C0" />
    </svg>
  );
}
