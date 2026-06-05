import React from 'react';
import { Link } from 'react-router-dom';

const ACCENT = {
  warning: {
    container: 'border-amber-200 bg-amber-50/40 hover:border-amber-300 hover:bg-amber-50/70',
    cta: 'text-amber-700 hover:text-amber-800',
    icon: 'text-amber-600',
  },
  neutral: {
    container: 'border-warmborder bg-white hover:border-warmborder-2 hover:bg-surface-2/60',
    cta: 'text-primary-600 hover:text-primary-700',
    icon: 'text-warmink-3',
  },
};

export default function ActionRow({
  icon,
  time,
  title,
  subtitle,
  cta,
  href,
  onClick,
  accent = 'neutral',
}) {
  const a = ACCENT[accent] || ACCENT.neutral;

  const inner = (
    <>
      {time && (
        <div className="text-xs font-semibold text-warmink-2 w-12 flex-shrink-0 tabular-nums">{time}</div>
      )}
      {!time && icon && (
        <div className={`w-6 flex-shrink-0 ${a.icon}`}>
          <i className={`fa-solid ${icon} text-sm`} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-warmink truncate">{title}</p>
        {subtitle && <p className="text-xs text-warmink-2 mt-0.5 truncate">{subtitle}</p>}
      </div>
      {cta && (
        <span className={`text-xs font-medium whitespace-nowrap ${a.cta}`}>{cta}</span>
      )}
    </>
  );

  const className = `flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${a.container}`;

  if (href) {
    return (
      <Link to={href} className={`${className} no-underline`}>{inner}</Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={`${className} w-full text-left`}>
      {inner}
    </button>
  );
}
