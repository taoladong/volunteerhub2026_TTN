import React from 'react';

export default function ProgressMeter({ value = 0, label, hint, className = '' }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={`rounded-lg border border-warmborder bg-white p-4 ${className}`}>
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-sm font-medium text-warmink">{label}</p>
        <span className="text-sm font-semibold text-primary-600 tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {hint && <p className="text-xs text-warmink-2 mt-2">{hint}</p>}
    </div>
  );
}
