import { useId } from 'react';

const LINE = 'M6 88 H20 L39 50 L55 72 L75 30 L91 100 L97 88 L106 70 L115 88 H122';
const SPARK = 'M95 9 C98.51 18.49 98.51 18.49 108 22 C98.51 25.51 98.51 25.51 95 35 C91.49 25.51 91.49 25.51 82 22 C91.49 18.49 91.49 18.49 95 9 Z';
const SPARK_SMALL = 'M108 32.5 C109.485 36.515 109.485 36.515 113.5 38 C109.485 39.485 109.485 39.485 108 43.5 C106.515 39.485 106.515 39.485 102.5 38 C106.515 36.515 106.515 36.515 108 32.5 Z';

/** MedAtlas Egypt mark: an ECG trace whose peaks are the three pyramids of Giza, with the teal AI spark.
 * Colour line on light backgrounds, white line in dark mode. */
export default function BrandMark({ className = '', title }: { className?: string; title?: string }) {
  const gradient = `brand-line-${useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 8 128 98" className={className} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <defs>
        <linearGradient id={gradient} x1="6" y1="0" x2="122" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2350FF" />
          <stop offset="1" stopColor="#5B3DF5" />
        </linearGradient>
      </defs>
      <path d={LINE} fill="none" stroke={`url(#${gradient})`} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" className="dark:hidden" />
      <path d={LINE} fill="none" stroke="#fff" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" className="hidden dark:block" />
      <path d={SPARK} fill="#21E3C0" />
      <path d={SPARK_SMALL} fill="#21E3C0" opacity={0.85} />
    </svg>
  );
}
