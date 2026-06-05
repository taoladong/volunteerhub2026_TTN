import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const STATUS_LABEL = {
  Approved:  { label: 'Đang mở',    bg: 'rgba(22,163,74,0.12)',  color: '#15803d', border: 'rgba(22,163,74,0.25)' },
  Completed: { label: 'Hoàn thành', bg: 'rgba(27,97,201,0.10)',  color: '#1552b0', border: 'rgba(27,97,201,0.25)' },
  Pending:   { label: 'Chờ duyệt',  bg: 'rgba(245,158,11,0.12)', color: '#92400e', border: 'rgba(245,158,11,0.28)' },
  Cancelled: { label: 'Đã hủy',     bg: 'rgba(220,38,38,0.09)',  color: '#991b1b', border: 'rgba(220,38,38,0.20)' },
};

function fmt(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function EventCard({ event, distance }) {
  const [hovered, setHovered] = useState(false);
  const pct = event.maxParticipants > 0
    ? Math.min(100, Math.round(((event.currentParticipants || 0) / event.maxParticipants) * 100)) : 0;
  const full = pct >= 100;

  const now = new Date();
  const startDate = event.startDate ? new Date(event.startDate) : null;
  const isOngoing = event.status === 'Approved' && startDate && startDate <= now;
  const st = isOngoing
    ? { label: 'Đang diễn ra', bg: 'rgba(245,158,11,0.12)', color: '#92400e', border: 'rgba(245,158,11,0.28)' }
    : (STATUS_LABEL[event.status] || { label: event.status, bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' });

  return (
    <Link to={`/events/${event.id}`} style={{ textDecoration: 'none', display: 'block', width: '100%', maxWidth: '100%', minWidth: 0 }}>
      <div style={{
        background: '#fff',
        border: `1px solid ${hovered ? '#93c5fd' : '#e5e7eb'}`,
        borderRadius: 16,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.16s',
        boxShadow: hovered
          ? '0 8px 28px rgba(27,97,201,0.14), 0 2px 8px rgba(0,0,0,0.06)'
          : '0 1px 4px rgba(0,0,0,0.06)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        height: '100%',
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
      }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Image */}
        <div style={{ height: 160, position: 'relative', overflow: 'hidden', background: 'rgba(27,97,201,0.07)', flexShrink: 0 }}>
          {event.imageUrl ? (
            <img src={event.imageUrl} alt={event.title} style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transform: hovered ? 'scale(1.04)' : 'scale(1)',
              transition: 'transform 0.3s',
            }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-calendar-days" style={{ fontSize: 40, color: 'rgba(27,97,201,0.25)' }} />
            </div>
          )}
          {/* Gradient overlay on image */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 60,
            background: 'linear-gradient(to top, rgba(0,0,0,0.35), transparent)',
          }} />
          {/* Status badge */}
          <div style={{ position: 'absolute', top: 10, right: 10 }}>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
              background: st.bg, color: st.color, border: `1px solid ${st.border}`,
            }}>{st.label}</span>
          </div>
          {/* Category */}
          {event.category?.name && (
            <div style={{ position: 'absolute', bottom: 10, left: 10 }}>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                background: 'rgba(255,255,255,0.92)', color: '#1b61c9',
              }}>{event.category.name}</span>
            </div>
          )}
          {/* Distance badge */}
          {distance != null && (
            <div style={{ position: 'absolute', top: 10, left: 10 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                background: 'rgba(5,150,105,0.90)', color: '#fff',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <i className="fa-solid fa-location-crosshairs" style={{ fontSize: 10 }} />
                {distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '16px 16px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h3 style={{
            fontWeight: 700, fontSize: 14.5, lineHeight: 1.4, color: '#181d26',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            transition: 'color 0.13s', ...(hovered ? { color: '#1b61c9' } : {}),
          }}>
            {event.title}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, color: 'rgba(4,14,32,0.52)' }}>
            {event.location && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="fa-solid fa-location-dot" style={{ color: '#1b61c9', width: 12, textAlign: 'center', fontSize: 11 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.location}</span>
              </span>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fa-regular fa-calendar" style={{ color: '#059669', width: 12, textAlign: 'center', fontSize: 11 }} />
              {fmt(event.startDate)}{event.endDate && event.endDate !== event.startDate ? ` — ${fmt(event.endDate)}` : ''}
            </span>
          </div>

          {/* Participants bar */}
          <div style={{ marginTop: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 5, color: 'rgba(4,14,32,0.50)' }}>
              <span>{event.currentParticipants || 0} / {event.maxParticipants} người</span>
              <span style={{ fontWeight: 700, color: full ? '#dc2626' : '#1b61c9' }}>
                {full ? 'Đầy chỗ' : `${pct}%`}
              </span>
            </div>
            <div style={{ height: 5, borderRadius: 4, background: '#f1f5f9', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 4, transition: 'width 0.4s',
                width: `${pct}%`,
                background: full
                  ? '#dc2626'
                  : pct > 70
                    ? '#f97316'
                    : '#1b61c9',
              }} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
