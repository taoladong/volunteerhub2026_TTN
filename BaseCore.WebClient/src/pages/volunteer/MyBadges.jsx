import React, { useState, useEffect } from 'react';
import { badgeApi } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';

function fmt(dt) {
  return dt ? new Date(dt).toLocaleDateString('vi-VN') : '';
}

export default function MyBadges({ embedded = false }) {
  const [myBadges, setMyBadges]   = useState([]);
  const [allBadges, setAllBadges] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null); // { badge, userBadge|null, earned }

  useEffect(() => {
    Promise.all([badgeApi.getMyBadges(), badgeApi.getAll()])
      .then(([myRes, allRes]) => {
        setMyBadges(myRes.data || []);
        setAllBadges(allRes.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const earnedMap   = new Map(myBadges.map((ub) => [ub.badgeId, ub]));
  const earnedCount = myBadges.length;
  const totalCount  = allBadges.length;
  const pct         = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;

  // Earned badges first, then locked
  const items = [
    ...myBadges.map((ub) => ({ id: ub.badgeId, badge: ub.badge, userBadge: ub, earned: true })),
    ...allBadges
      .filter((b) => !earnedMap.has(b.id))
      .map((b) => ({ id: b.id, badge: b, userBadge: null, earned: false })),
  ];

  if (items.length === 0) {
    return (
      <EmptyState
        icon="fa-medal"
        title="Chưa có huy hiệu nào"
        description="Tham gia và hoàn thành sự kiện để nhận huy hiệu đầu tiên."
        cta="Khám phá sự kiện"
        ctaTo="/events"
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Progress strip */}
      <div
        className="card px-5 py-4"
        style={{ border: '1px solid rgba(15,15,15,0.08)' }}
      >
        <div className="flex items-baseline justify-between mb-2.5">
          <span className="text-sm font-medium" style={{ color: 'var(--c-ink)' }}>
            Đã đạt{' '}
            <span className="font-semibold" style={{ color: '#b45309' }}>{earnedCount}</span>
            {' '}/ {totalCount} huy hiệu
          </span>
          <span className="text-sm font-semibold tabular-nums" style={{ color: '#b45309' }}>
            {pct}%
          </span>
        </div>
        <div
          className="h-[3px] rounded-full overflow-hidden"
          style={{ background: 'var(--c-surface-2)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
            }}
          />
        </div>
      </div>

      {/* Badge grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {items.map(({ id, badge, userBadge, earned }) => (
          <BadgeCell
            key={id}
            badge={badge}
            userBadge={userBadge}
            earned={earned}
            onSelect={() => setSelected({ badge, userBadge, earned })}
          />
        ))}
      </div>

      {/* Detail modal */}
      {selected && (
        <BadgeModal
          badge={selected.badge}
          userBadge={selected.userBadge}
          earned={selected.earned}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

/* ─── Badge cell ──────────────────────────────────────────────────── */

function BadgeCell({ badge, userBadge, earned, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex flex-col items-center text-center"
    >
      {/* Icon area */}
      <div
        className="relative w-[80px] h-[80px] sm:w-[88px] sm:h-[88px] rounded-2xl flex items-center justify-center overflow-hidden mb-2 transition-all"
        style={
          earned
            ? {
                background: 'rgba(245,158,11,0.08)',
                border: '1.5px solid rgba(245,158,11,0.28)',
              }
            : {
                background: 'rgba(15,15,15,0.03)',
                border: '1px solid rgba(15,15,15,0.08)',
              }
        }
        onMouseEnter={(e) => {
          if (earned) e.currentTarget.style.borderColor = 'rgba(245,158,11,0.50)';
          else e.currentTarget.style.borderColor = 'rgba(15,15,15,0.18)';
        }}
        onMouseLeave={(e) => {
          if (earned) e.currentTarget.style.borderColor = 'rgba(245,158,11,0.28)';
          else e.currentTarget.style.borderColor = 'rgba(15,15,15,0.08)';
        }}
      >
        {/* Badge icon */}
        <div
          className={`flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 ${
            earned ? '' : 'blur-[2px] grayscale opacity-35'
          }`}
        >
          {badge?.iconUrl ? (
            <img
              src={badge.iconUrl}
              alt={badge?.name}
              className="w-full h-full object-contain"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <i
              className="fa-solid fa-medal text-3xl"
              style={{ color: earned ? '#d97706' : 'rgba(15,15,15,0.18)' }}
            />
          )}
        </div>

        {/* Lock overlay */}
        {!earned && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(255,255,255,0.90)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.14)',
              }}
            >
              <i
                className="fa-solid fa-lock text-[11px]"
                style={{ color: 'rgba(15,15,15,0.45)' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Name */}
      <p
        className="text-[12px] font-medium leading-snug line-clamp-2"
        style={{ color: earned ? 'var(--c-ink)' : 'rgba(15,15,15,0.38)' }}
      >
        {badge?.name}
      </p>

      {/* Earned date */}
      {earned && userBadge?.awardedAt && (
        <p className="text-[11px] mt-0.5" style={{ color: '#b45309' }}>
          {fmt(userBadge.awardedAt)}
        </p>
      )}
    </button>
  );
}

/* ─── Badge detail modal ─────────────────────────────────────────── */

function BadgeModal({ badge, userBadge, earned, onClose }) {
  const origin    = window.location.origin;
  const shareText = encodeURIComponent(
    `Tôi vừa đạt huy hiệu "${badge?.name}" trên VolunteerHub! 🏅`,
  );
  const shareUrl        = encodeURIComponent(`${origin}/achievements`);
  const shareLinkedin   = `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`;
  const shareFacebook   = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&quote=${shareText}`;

  return (
    <Modal isOpen onClose={onClose} title="" size="sm">
      <div className="text-center pb-1">
        {/* Large icon */}
        <div
          className="w-24 h-24 mx-auto rounded-3xl flex items-center justify-center mb-4 overflow-hidden"
          style={
            earned
              ? { background: 'rgba(245,158,11,0.09)', border: '2px solid rgba(245,158,11,0.28)' }
              : { background: 'rgba(15,15,15,0.04)', border: '1px solid rgba(15,15,15,0.08)' }
          }
        >
          {badge?.iconUrl ? (
            <img
              src={badge.iconUrl}
              alt={badge?.name}
              className={`w-16 h-16 object-contain ${earned ? '' : 'grayscale opacity-35'}`}
            />
          ) : (
            <i
              className="fa-solid fa-medal text-4xl"
              style={{ color: earned ? '#d97706' : 'rgba(15,15,15,0.20)' }}
            />
          )}
        </div>

        {/* Name */}
        <h3 className="text-[17px] font-semibold" style={{ color: 'var(--c-ink)' }}>
          {badge?.name}
        </h3>

        {/* Earned date */}
        {earned && userBadge?.awardedAt && (
          <p className="text-sm mt-1 font-medium" style={{ color: '#b45309' }}>
            <i className="fa-solid fa-trophy mr-1.5 text-amber-500" />
            Đạt được ngày {fmt(userBadge.awardedAt)}
          </p>
        )}

        {/* Description */}
        {badge?.description && (
          <p className="text-sm mt-3 leading-relaxed" style={{ color: 'rgba(15,15,15,0.60)' }}>
            {badge.description}
          </p>
        )}

        {/* Locked hint */}
        {!earned && (
          <div
            className="mt-4 rounded-lg px-4 py-3 text-sm text-left"
            style={{
              background: 'rgba(15,15,15,0.03)',
              border: '1px solid rgba(15,15,15,0.07)',
              color: 'rgba(15,15,15,0.55)',
            }}
          >
            <p className="font-medium mb-0.5" style={{ color: 'rgba(15,15,15,0.70)' }}>
              <i className="fa-solid fa-lock mr-1.5 text-[11px]" />
              Chưa mở khóa
            </p>
            Tiếp tục tham gia sự kiện và hoàn thành các thử thách để đạt huy hiệu này.
          </div>
        )}

        {/* Share buttons — earned only */}
        {earned && (
          <div className="mt-5 flex items-center justify-center gap-2">
            <a
              href={shareLinkedin}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white no-underline"
              style={{ background: '#0a66c2' }}
            >
              <i className="fa-brands fa-linkedin" /> LinkedIn
            </a>
            <a
              href={shareFacebook}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white no-underline"
              style={{ background: '#1877f2' }}
            >
              <i className="fa-brands fa-facebook" /> Facebook
            </a>
          </div>
        )}
      </div>
    </Modal>
  );
}
