import React from 'react';

export default function Tabs({ tabs, value, onChange, className = '' }) {
  return (
    <div className={`flex items-center gap-1 border-b border-warmborder ${className}`}>
      {tabs.map((tab) => {
        const active = value === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`relative px-3 py-2.5 text-sm font-medium transition-colors ${
              active ? 'text-warmink' : 'text-warmink-2 hover:text-warmink-2'
            }`}
          >
            <span className="flex items-center gap-2">
              {tab.label}
              {tab.count != null && (
                <span className={`text-[11px] rounded-full px-1.5 py-0.5 ${
                  active ? 'bg-primary-100 text-primary-700' : 'bg-surface-2 text-warmink-2'
                }`}>
                  {tab.count}
                </span>
              )}
            </span>
            {active && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary-600 rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
