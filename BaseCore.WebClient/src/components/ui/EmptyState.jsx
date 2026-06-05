import React from 'react';
import { Link } from 'react-router-dom';

/**
 * EmptyState — Linear/Notion-style
 * Props:
 *   icon        FontAwesome class (default 'fa-inbox')
 *   title       Headline (required)
 *   description Sub-text (optional)
 *   cta         Button label (optional)
 *   ctaTo       Link href — renders <Link> if provided
 *   onCta       onClick — renders <button> if no ctaTo
 *   ctaVariant  'primary' | 'secondary' (default 'primary')
 *   className   Extra wrapper classes
 */
export default function EmptyState({
  icon = 'fa-inbox',
  title = 'Chưa có dữ liệu',
  description,
  cta,
  ctaTo,
  onCta,
  ctaVariant = 'primary',
  className = '',
}) {
  const btnClass = `mt-6 inline-flex items-center gap-2 ${ctaVariant === 'secondary' ? 'btn-secondary' : 'btn-primary'}`;

  return (
    <div
      className={`rounded-lg bg-white px-8 py-14 text-center ${className}`}
      style={{ border: '1px solid rgba(15,15,15,0.08)' }}
    >
      {/* Icon container */}
      <div
        className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-5"
        style={{
          background: 'rgba(15,15,15,0.03)',
          border: '1px solid rgba(15,15,15,0.06)',
        }}
      >
        <i className={`fa-solid ${icon} text-2xl`} style={{ color: 'rgba(15,15,15,0.25)' }} />
      </div>

      {/* Headline */}
      <p className="text-[15px] font-medium leading-snug" style={{ color: 'var(--c-ink)' }}>
        {title}
      </p>

      {/* Description */}
      {description && (
        <p
          className="text-sm mt-2 max-w-[22rem] mx-auto leading-relaxed"
          style={{ color: 'rgba(15,15,15,0.55)' }}
        >
          {description}
        </p>
      )}

      {/* CTA */}
      {cta && (
        ctaTo ? (
          <Link to={ctaTo} className={btnClass}>
            {cta}
            <i className="fa-solid fa-arrow-right text-[11px]" />
          </Link>
        ) : (
          <button type="button" onClick={onCta} className={btnClass}>
            {cta}
            <i className="fa-solid fa-arrow-right text-[11px]" />
          </button>
        )
      )}
    </div>
  );
}
