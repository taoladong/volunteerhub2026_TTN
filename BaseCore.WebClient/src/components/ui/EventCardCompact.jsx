import React from 'react';
import { Link } from 'react-router-dom';

function formatShortDate(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  } catch {
    return '';
  }
}

export default function EventCardCompact({ event, matchPct }) {
  const date = formatShortDate(event.startDate);

  return (
    <Link
      to={`/events/${event.id}`}
      className="group flex-shrink-0 w-[232px] snap-start overflow-hidden no-underline"
      style={{
        background: 'var(--c-surface)',
        border: '1px solid var(--c-border)',
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--shadow-card)',
        color: 'inherit',
        transition: 'box-shadow .2s, transform .2s, border-color .2s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-card-h)'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'var(--c-border-2)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-card)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--c-border)'; }}
    >
      {/* Image — 16:10 */}
      <div
        className="overflow-hidden"
        style={{ aspectRatio: '16/10', background: 'var(--c-surface-2)' }}
      >
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt=""
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <i className="fa-solid fa-calendar-days text-2xl" style={{ color: 'rgba(27,97,201,0.18)' }} />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-3">
        {/* Title */}
        <p
          className="text-[13px] font-semibold leading-snug line-clamp-2 min-h-[2.5rem]"
          style={{ color: 'var(--c-ink)' }}
        >
          {event.title}
        </p>

        {/* Meta */}
        <p className="text-[11px] mt-2 truncate" style={{ color: 'var(--c-ink-2)' }}>
          {date && (
            <>
              <i className="fa-solid fa-calendar mr-1" style={{ color: 'var(--c-ink-3)' }} />
              {date}
            </>
          )}
          {event.location ? `  ·  ${event.location}` : ''}
        </p>

        {/* Match pill */}
        {matchPct != null && matchPct > 0 && (
          <p
            className="text-[11px] font-semibold mt-1.5 flex items-center gap-1"
            style={{ color: 'var(--c-primary-700)' }}
          >
            <i className="fa-solid fa-sparkles text-[9px]" />
            Phù hợp {matchPct}%
          </p>
        )}
      </div>
    </Link>
  );
}
