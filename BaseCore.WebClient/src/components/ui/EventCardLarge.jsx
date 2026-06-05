import React from 'react';
import { Link } from 'react-router-dom';

function formatDate(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

const MONTHS = ['TH1', 'TH2', 'TH3', 'TH4', 'TH5', 'TH6', 'TH7', 'TH8', 'TH9', 'TH10', 'TH11', 'TH12'];

function dateParts(d) {
  if (!d) return null;
  try {
    const dt = new Date(d);
    return { day: String(dt.getDate()).padStart(2, '0'), month: MONTHS[dt.getMonth()] };
  } catch {
    return null;
  }
}

/**
 * EventCardLarge — hero-image card dùng ở Landing + EventList.
 * Props: event, matchPct (0-100 | null), footer (ReactNode)
 */
export default function EventCardLarge({ event, matchPct, footer }) {
  const fillRatio =
    event.maxParticipants > 0
      ? Math.min(100, Math.round(((event.currentParticipants || 0) / event.maxParticipants) * 100))
      : 0;

  const isFull = event.maxParticipants > 0 && fillRatio >= 100;
  const dp = dateParts(event.startDate);

  return (
    <Link
      to={`/events/${event.id}`}
      className="group flex flex-col overflow-hidden no-underline"
      style={{
        background: 'var(--c-surface)',
        border: '1px solid var(--c-border)',
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--shadow-card)',
        transition: 'box-shadow .2s, transform .2s, border-color .2s',
        color: 'inherit',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-card-h)';
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.borderColor = 'var(--c-border-2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-card)';
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.borderColor = 'var(--c-border)';
      }}
    >
      {/* Media — 16:10 */}
      <div className="relative overflow-hidden" style={{ aspectRatio: '16/10', background: 'var(--c-surface-2)' }}>
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt=""
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <i className="fa-solid fa-calendar-days text-3xl" style={{ color: 'rgba(27,97,201,0.18)' }} />
          </div>
        )}

        {/* Date chip */}
        {dp && (
          <div
            className="absolute text-center"
            style={{ top: 12, left: 12, background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(4px)', borderRadius: 12, padding: '6px 10px', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', minWidth: 48 }}
          >
            <div className="font-bold leading-none" style={{ fontSize: 19, color: 'var(--c-ink)' }}>{dp.day}</div>
            <div className="font-semibold uppercase" style={{ fontSize: 10, letterSpacing: '0.06em', color: 'var(--c-accent-700)', marginTop: 2 }}>{dp.month}</div>
          </div>
        )}

        {/* Float pills top-right */}
        {((matchPct != null && matchPct > 0) || event.requiresKyc) && (
          <div className="absolute flex flex-col items-end gap-1.5" style={{ top: 12, right: 12 }}>
            {matchPct != null && matchPct > 0 && (
              <span className="badge" style={{ background: 'rgba(255,255,255,0.94)', color: 'var(--c-primary-700)', backdropFilter: 'blur(4px)' }}>
                <i className="fa-solid fa-sparkles text-[9px]" /> Hợp {matchPct}%
              </span>
            )}
            {event.requiresKyc && (
              <span className="badge" style={{ background: 'var(--c-amber-50)', color: 'var(--c-amber)' }}>KYC</span>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1" style={{ padding: '16px 16px 17px' }}>
        {/* Category */}
        {(event.category?.name || isFull) && (
          <div className="flex items-center gap-1.5 flex-wrap" style={{ marginBottom: 10 }}>
            {event.category?.name && (
              <span className="badge" style={{ background: 'var(--c-surface-2)', color: 'var(--c-ink-2)' }}>
                {event.category.name}
              </span>
            )}
            {isFull && (
              <span className="badge" style={{ background: 'var(--c-surface-2)', color: 'var(--c-ink-3)' }}>
                Đã đủ chỗ
              </span>
            )}
          </div>
        )}

        {/* Title */}
        <h3
          className="font-semibold line-clamp-2"
          style={{ fontSize: 16, lineHeight: 1.3, color: 'var(--c-ink)' }}
        >
          {event.title}
        </h3>

        {/* Meta */}
        <div className="flex flex-col gap-1.5" style={{ marginTop: 10 }}>
          <p className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--c-ink-2)' }}>
            <i className="fa-solid fa-calendar text-[12px]" style={{ width: 14, textAlign: 'center', color: 'var(--c-ink-3)' }} />
            {formatDate(event.startDate)}
          </p>
          {event.location && (
            <p className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--c-ink-2)' }}>
              <i className="fa-solid fa-location-dot text-[12px]" style={{ width: 14, textAlign: 'center', color: 'var(--c-ink-3)' }} />
              <span className="truncate">{event.location}</span>
            </p>
          )}
        </div>

        {/* Footer: progress */}
        {event.maxParticipants > 0 && (
          <div style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--c-border)' }}>
            <div className="flex justify-between text-[12px]" style={{ marginBottom: 6 }}>
              <span className="font-semibold" style={{ color: 'var(--c-ink)' }}>{event.currentParticipants || 0}/{event.maxParticipants} TNV</span>
              <span className="font-semibold" style={{ color: isFull ? 'var(--c-ink-3)' : 'var(--c-primary-700)' }}>{fillRatio}%</span>
            </div>
            <div className="overflow-hidden" style={{ height: 6, borderRadius: 4, background: 'var(--c-surface-2)' }}>
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${fillRatio}%`,
                  borderRadius: 4,
                  background: isFull ? 'var(--c-ink-3)' : 'linear-gradient(90deg, var(--c-primary) 0%, var(--c-primary-700) 100%)',
                }}
              />
            </div>
          </div>
        )}

        {footer && <div style={{ marginTop: 12 }}>{footer}</div>}
      </div>
    </Link>
  );
}
