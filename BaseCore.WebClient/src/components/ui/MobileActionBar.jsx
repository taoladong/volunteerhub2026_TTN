import React from 'react';

export default function MobileActionBar({ children, className = '' }) {
  return (
    <div
      className={`sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-warmborder px-4 py-3 ${className}`}
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="max-w-lg mx-auto flex items-center gap-2">
        {children}
      </div>
    </div>
  );
}
