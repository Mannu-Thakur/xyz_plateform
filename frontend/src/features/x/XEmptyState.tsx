import React from 'react';
import { cn } from '../../shared/lib/cn';

interface Suggestion {
  icon: string;
  label: string;
  prompt: string;
}

const SUGGESTIONS: Suggestion[] = [
  { icon: '🐛', label: 'Debug my code', prompt: '/debug' },
  { icon: '💡', label: 'Give me a hint', prompt: '/hint' },
  { icon: '⏱️', label: 'Analyze complexity', prompt: '/complexity' },
  { icon: '🚀', label: 'Optimize my solution', prompt: '/optimize' },
  { icon: '📖', label: 'Explain line by line', prompt: 'Explain my code line by line in detail.' },
  { icon: '🧪', label: 'Generate test cases', prompt: 'Generate 5 edge case test cases for this problem including their expected outputs.' },
  { icon: '🔍', label: 'Why am I getting TLE?', prompt: 'Why is my solution getting Time Limit Exceeded? Identify the bottleneck and suggest how to fix it.' },
  { icon: '🔥', label: 'Find the bug', prompt: 'Find the bug in my code. Do not give the full solution, just point out what is wrong.' },
];

interface XEmptyStateProps {
  onSuggestion: (prompt: string) => void;
  isCompact?: boolean;
  isIconOnly?: boolean;
}

export const XEmptyState: React.FC<XEmptyStateProps> = ({
  onSuggestion,
  isCompact = false,
  isIconOnly = false,
}) => {
  return (
    <div className={cn("flex flex-col items-center justify-center h-full px-4 select-none", isIconOnly ? "py-4" : "py-8")}>
      {/* Simple & Sleek X Logo */}
      <div className={cn("flex items-center justify-center", isIconOnly ? "mb-3" : "mb-5")}>
        <svg
          viewBox="0 0 24 24"
          className={cn(
            "text-amber-400/90 hover:text-amber-300 transition-all duration-300 hover:scale-105",
            isIconOnly ? "w-7 h-7" : "w-10 h-10"
          )}
          fill="none"
        >
          <path d="M18 6L6 18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M6 6L18 18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </div>

      <h2 className="text-[15px] font-bold tracking-tight text-gray-100 mb-1">X is ready</h2>
      {!isIconOnly && (
        <p className="text-xs text-gray-400 text-center max-w-[210px] leading-relaxed mb-6">
          Your AI coding companion. Ask anything about the problem, your code, or errors.
        </p>
      )}

      {/* Suggestion grid */}
      {!isIconOnly && (
        <div className={cn("grid gap-2 w-full max-w-xs", isCompact ? "grid-cols-1" : "grid-cols-2")}>
          {(isCompact ? SUGGESTIONS.slice(0, 4) : SUGGESTIONS).map((s) => (
            <button
              key={s.label}
              onClick={() => onSuggestion(s.prompt)}
              className="x-suggestion-card group text-left p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-amber-500/30 transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm block leading-none">{s.icon}</span>
                <span className="text-[11px] font-medium text-gray-300 group-hover:text-amber-200 transition-colors leading-tight block truncate">{s.label}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
