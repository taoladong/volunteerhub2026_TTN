import React from 'react';

export default function StatCard({ icon, label, value, color = 'green', sub }) {
  const colors = {
    green:  'bg-primary-50 text-primary-600',
    blue:   'bg-blue-50 text-blue-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red:    'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm mb-1" style={{ color: 'rgba(15,15,15,0.50)' }}>{label}</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--c-ink)' }}>{value ?? '—'}</p>
          {sub && <p className="text-xs mt-1" style={{ color: 'rgba(15,15,15,0.40)' }}>{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color] || colors.green}`}>
          <i className={`fa-solid ${icon} text-lg`} />
        </div>
      </div>
    </div>
  );
}
