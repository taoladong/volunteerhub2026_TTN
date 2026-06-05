import React from 'react';

export default function SectionLabel({ children, action, className = '' }) {
  return (
    <div className={`flex items-center justify-between mb-3 ${className}`}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-warmink-2">{children}</span>
      {action}
    </div>
  );
}
