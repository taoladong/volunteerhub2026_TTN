import React, { useState, useEffect } from 'react';
import { profileApi, certificateApi } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

function fmt(dt) {
  return dt ? new Date(dt).toLocaleDateString('vi-VN') : '';
}

const LEVEL_PILL = {
  Beginner:     { bg: 'rgba(245,158,11,0.09)',  color: '#b45309' },
  Intermediate: { bg: 'rgba(27,97,201,0.09)',   color: '#1b61c9' },
  Expert:       { bg: 'rgba(15,15,15,0.08)',    color: 'var(--c-ink)' },
};

const REG_STATUS = {
  Approved:          { label: 'Đã duyệt',      bg: 'rgba(22,163,74,0.09)',   color: '#15803d' },
  CheckedIn:         { label: 'Đã check-in',   bg: 'rgba(27,97,201,0.09)',   color: '#1b61c9' },
  Completed:         { label: 'Hoàn thành',    bg: 'rgba(22,163,74,0.09)',   color: '#15803d' },
  Cancelled:         { label: 'Đã hủy',        bg: 'rgba(15,15,15,0.06)',    color: 'rgba(15,15,15,0.50)' },
  Pending:           { label: 'Chờ duyệt',     bg: 'rgba(245,158,11,0.09)', color: '#b45309' },
};

export default function Passport({ embedded = false }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    profileApi.getPassport()
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!data)   return null;

  const { profile, skills, totalEvents, totalHours, registrations, certificates } = data;
  const attended  = (registrations || []).filter((r) => r.isAttended);
  const certsAll  = certificates || [];

  const statItems = [
    { label: 'Giờ tình nguyện', value: `${totalHours || 0}h`, icon: 'fa-clock', iconColor: '#1b61c9' },
    { label: 'Sự kiện', value: totalEvents || 0, icon: 'fa-calendar-check', iconColor: 'var(--c-ink)' },
    { label: 'Chứng chỉ', value: certificates?.length || 0, icon: 'fa-certificate', iconColor: '#b45309' },
  ];
  if (profile?.donationCount > 0) {
    statItems.push({ label: 'Lần ủng hộ', value: profile.donationCount, icon: 'fa-hand-holding-heart', iconColor: '#15803d' });
  }

  return (
    <div className={embedded ? 'space-y-4' : 'max-w-2xl mx-auto space-y-4'}>

      {/* ── Hero card ── */}
      <div
        className="rounded-lg bg-white overflow-hidden"
        style={{ border: '1px solid rgba(15,15,15,0.08)' }}
      >
        {/* Top accent bar */}
        <div
          className="h-[4px]"
          style={{ background: 'linear-gradient(90deg, #4d84e8 0%, #1b61c9 100%)' }}
        />

        {/* Avatar + name */}
        <div className="px-5 pt-5 pb-4 flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0"
            style={{ border: '2px solid rgba(15,15,15,0.08)' }}
          >
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: 'rgba(15,15,15,0.04)' }}
              >
                <i className="fa-solid fa-user text-2xl" style={{ color: 'rgba(15,15,15,0.25)' }} />
              </div>
            )}
          </div>
          <div>
            <p className="text-[18px] font-semibold" style={{ color: 'var(--c-ink)' }}>
              {profile?.user?.name || 'Tình nguyện viên'}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <i className="fa-solid fa-id-card text-[11px]" style={{ color: 'rgba(27,97,201,0.60)' }} />
              <span className="text-[12px] font-medium" style={{ color: 'rgba(15,15,15,0.50)' }}>
                Hộ chiếu Tình nguyện
              </span>
            </div>
            {profile?.bloodType && (
              <span className="text-[11px]" style={{ color: 'rgba(15,15,15,0.40)' }}>
                Nhóm máu {profile.bloodType}
              </span>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div
          className="grid divide-x"
          style={{
            gridTemplateColumns: `repeat(${statItems.length}, minmax(0, 1fr))`,
            borderTop: '1px solid rgba(15,15,15,0.06)',
            divideColor: 'rgba(15,15,15,0.06)',
          }}
        >
          {statItems.map((s) => (
            <div
              key={s.label}
              className="py-4 text-center"
              style={{ borderRight: '1px solid rgba(15,15,15,0.06)' }}
            >
              <i
                className={`fa-solid ${s.icon} text-[13px] mb-1.5 block`}
                style={{ color: s.iconColor }}
              />
              <p className="text-[20px] font-bold leading-none" style={{ color: 'var(--c-ink)' }}>
                {s.value}
              </p>
              <p className="text-[11px] mt-1" style={{ color: 'rgba(15,15,15,0.40)' }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bio ── */}
      {profile?.bio && (
        <div
          className="rounded-lg bg-white px-5 py-4"
          style={{ border: '1px solid rgba(15,15,15,0.08)' }}
        >
          <SectionTitle icon="fa-quote-left" title="Giới thiệu" />
          <p className="text-[13px] leading-relaxed mt-3" style={{ color: 'rgba(15,15,15,0.60)' }}>
            {profile.bio}
          </p>
        </div>
      )}

      {/* ── Skills ── */}
      {skills?.length > 0 && (
        <div
          className="rounded-lg bg-white px-5 py-4"
          style={{ border: '1px solid rgba(15,15,15,0.08)' }}
        >
          <SectionTitle icon="fa-star" title="Kỹ năng" />
          <div className="flex flex-wrap gap-2 mt-3">
            {skills.map((vs) => {
              const lvl = LEVEL_PILL[vs.level] || LEVEL_PILL.Beginner;
              return (
                <div
                  key={vs.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{
                    background: 'rgba(15,15,15,0.03)',
                    border: '1px solid rgba(15,15,15,0.09)',
                  }}
                >
                  <span className="text-[13px] font-medium" style={{ color: 'var(--c-ink)' }}>
                    {vs.skill?.name}
                  </span>
                  <span
                    className="text-[11px] font-medium px-1.5 py-0.5 rounded-full"
                    style={{ background: lvl.bg, color: lvl.color }}
                  >
                    {vs.level}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Certificates ── */}
      {certsAll.length > 0 && (
        <div
          className="rounded-lg bg-white px-5 py-4"
          style={{ border: '1px solid rgba(15,15,15,0.08)' }}
        >
          <SectionTitle icon="fa-certificate" title={`Chứng chỉ (${certsAll.length})`} />

          <div className="space-y-2 mt-3">
            {certsAll.map((c) => (
              <a
                key={c.id}
                href={certificateApi.getPdfUrl(c.certificateCode)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 no-underline transition-colors"
                style={{
                  background: 'rgba(15,15,15,0.02)',
                  border: '1px solid rgba(15,15,15,0.07)',
                  color: 'inherit',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(27,97,201,0.04)';
                  e.currentTarget.style.borderColor = 'rgba(27,97,201,0.20)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(15,15,15,0.02)';
                  e.currentTarget.style.borderColor = 'rgba(15,15,15,0.07)';
                }}
                title="Mở PDF chứng chỉ trong tab mới"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(180,83,9,0.08)' }}
                >
                  <i className="fa-solid fa-certificate text-[13px]" style={{ color: '#b45309' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate" style={{ color: 'var(--c-ink)' }}>
                    {c.event?.title}
                  </p>
                  <p className="text-[11px]" style={{ color: 'rgba(15,15,15,0.45)' }}>
                    {c.volunteerHours}h · {fmt(c.issuedAt)}
                  </p>
                </div>
                <code
                  className="text-[10px] flex-shrink-0 hidden sm:inline"
                  style={{ color: 'rgba(15,15,15,0.35)' }}
                >
                  {c.certificateCode}
                </code>
                <i
                  className="fa-solid fa-file-pdf text-[14px] flex-shrink-0"
                  style={{ color: 'rgba(185,28,28,0.65)' }}
                  aria-hidden="true"
                />
              </a>
            ))}
          </div>

        </div>
      )}

      {/* ── Timeline ── */}
      {attended.length > 0 && (
        <div
          className="rounded-lg bg-white px-5 py-4"
          style={{ border: '1px solid rgba(15,15,15,0.08)' }}
        >
          <SectionTitle icon="fa-timeline" title="Lịch sử tham gia" />

          <div className="mt-3 relative">
            {/* Vertical line */}
            {attended.length > 1 && (
              <div
                className="absolute left-[9px] top-4 bottom-4"
                style={{ width: 1, background: 'rgba(15,15,15,0.08)' }}
              />
            )}

            <div className="space-y-4">
              {attended.map((r, idx) => {
                const st = REG_STATUS[r.status] || REG_STATUS.Approved;
                return (
                  <div key={r.id} className="flex gap-3 items-start relative">
                    {/* Dot */}
                    <div
                      className="w-[19px] h-[19px] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 relative z-10"
                      style={{
                        background: '#fff',
                        border: '1.5px solid rgba(27,97,201,0.35)',
                      }}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: '#1b61c9' }}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-0.5">
                      <p className="text-[13px] font-medium leading-snug" style={{ color: 'var(--c-ink)' }}>
                        {r.event?.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[11px]" style={{ color: 'rgba(15,15,15,0.45)' }}>
                          {fmt(r.attendedAt || r.event?.startDate)}
                        </span>
                        {r.volunteerHours > 0 && (
                          <span
                            className="text-[11px] font-medium px-1.5 py-0.5 rounded-full"
                            style={{ background: 'rgba(27,97,201,0.08)', color: '#1b61c9' }}
                          >
                            {r.volunteerHours}h
                          </span>
                        )}
                        <span
                          className="text-[11px] font-medium px-1.5 py-0.5 rounded-full"
                          style={{ background: st.bg, color: st.color }}
                        >
                          {st.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Empty state if nothing */}
      {attended.length === 0 && !skills?.length && !certificates?.length && !profile?.bio && (
        <div
          className="rounded-lg bg-white px-8 py-12 text-center"
          style={{ border: '1px solid rgba(15,15,15,0.08)' }}
        >
          <i className="fa-solid fa-seedling text-3xl mb-3 block" style={{ color: 'rgba(15,15,15,0.18)' }} />
          <p className="text-[14px] font-medium" style={{ color: 'var(--c-ink)' }}>Hộ chiếu đang trống</p>
          <p className="text-[13px] mt-1" style={{ color: 'rgba(15,15,15,0.45)' }}>
            Tham gia sự kiện để bắt đầu xây dựng hành trình tình nguyện của bạn.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Section title helper ──────────────────────────────────────────── */

function SectionTitle({ icon, title }) {
  return (
    <div className="flex items-center gap-2">
      <i className={`fa-solid ${icon} text-[13px]`} style={{ color: 'rgba(15,15,15,0.40)' }} />
      <span className="text-[14px] font-semibold" style={{ color: 'var(--c-ink)' }}>
        {title}
      </span>
    </div>
  );
}
