import { AlertCircle } from 'lucide-react';

interface AiDisclaimerProps {
  className?: string;
}

export default function AiDisclaimer({ className = '' }: AiDisclaimerProps) {
  return (
    <div
      className={`flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-500 dark:text-slate-400 ${className}`}
    >
      <AlertCircle className="h-3 w-3 shrink-0 text-amber-500" />
      <span>AI-generated study aid. It can make mistakes. Verify with your lecture notes and textbooks.</span>
    </div>
  );
}
