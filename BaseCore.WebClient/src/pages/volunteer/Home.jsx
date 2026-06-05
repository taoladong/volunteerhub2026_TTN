import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { profileApi, registrationApi, eventApi, dashboardApi, certificateApi } from '../../services/api';
import { DashboardSkeleton } from '../../components/ui/Skeleton';
import SectionLabel from '../../components/ui/SectionLabel';
import ActionRow from '../../components/ui/ActionRow';
import EventCardCompact from '../../components/ui/EventCardCompact';
import { isWithinCheckinWindow } from '../../utils/checkin';

const TINT = {
  primary: { background: 'var(--c-primary-50)', color: 'var(--c-primary-700)' },
  accent: { background: 'var(--c-accent-50)', color: 'var(--c-accent-700)' },
  amber: { background: 'var(--c-amber-50)', color: 'var(--c-amber)' },
  success: { background: 'var(--c-success-50)', color: 'var(--c-success)' },
};

function StatCard({ icon, tint, num, label }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <span className="flex items-center justify-center" style={{ width: 38, height: 38, borderRadius: 11, ...TINT[tint], fontSize: 15 }}>
        <i className={`fa-solid ${icon}`} />
      </span>
      <div className="font-semibold leading-none" style={{ fontSize: 26, marginTop: 12, color: 'var(--c-ink)', letterSpacing: '-0.01em' }}>{num}</div>
      <div style={{ fontSize: 12.5, color: 'var(--c-ink-2)', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'Chào buổi sáng';
  if (h >= 11 && h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

function formatTime(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function firstName(name) {
  if (!name) return 'bạn';
  const parts = String(name).trim().split(/\s+/);
  return parts[parts.length - 1];
}

export default function VolunteerHome() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [mySkillIds, setMySkillIds] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [stats, setStats] = useState({ totalHours: 0, attendedEvents: 0, badges: 0, certificates: 0 });

  useEffect(() => {
    Promise.all([
      profileApi.getMyProfile().catch(() => ({ data: {} })),
      registrationApi.getMyRegistrations().catch(() => ({ data: [] })),
      eventApi.getRecommended().catch(() => ({ data: [] })),
      eventApi.getAll({ status: 'Approved', page: 1, pageSize: 12 }).catch(() => ({ data: { items: [] } })),
      dashboardApi.get().catch(() => ({ data: {} })),
      certificateApi.getMyCertificates().catch(() => ({ data: [] })),
    ])
      .then(([profileRes, regsRes, recRes, evRes, dashRes, certRes]) => {
        const p = profileRes?.data?.profile || null;
        const skills = profileRes?.data?.volunteerSkills || profileRes?.data?.skills || [];
        const skillIds = skills.map((s) => s.skillId || s.id).filter(Boolean);
        setProfile(p);
        setMySkillIds(skillIds);
        setRegistrations(regsRes?.data || []);

        const skillSet = new Set(skillIds);
        const now = new Date();
        const recList = Array.isArray(recRes?.data) ? recRes.data : [];
        const upcomingList = Array.isArray(evRes?.data?.items) ? evRes.data.items : [];

        const scored = (recList.length > 0 ? recList : upcomingList)
          .filter((e) => e.status === 'Approved' && (!e.startDate || new Date(e.startDate) > now))
          .map((e) => {
            let reqIds = [];
            try { reqIds = JSON.parse(e.requiredSkillIds || '[]'); } catch {}
            const match = reqIds.length === 0
              ? null
              : Math.round((reqIds.filter((id) => skillSet.has(id)).length / reqIds.length) * 100);
            return { ...e, _matchPct: match };
          })
          .sort((a, b) => (b._matchPct ?? 0) - (a._matchPct ?? 0) || new Date(a.startDate) - new Date(b.startDate))
          .slice(0, 8);
        setRecommended(scored);

        const d = dashRes?.data || {};
        const certCount = Array.isArray(certRes?.data) ? certRes.data.length : (certRes?.data?.items?.length || 0);
        setStats({
          totalHours: d.totalHours || 0,
          attendedEvents: d.attendedEvents || 0,
          badges: d.recentBadges?.length || d.totalBadges || 0,
          certificates: certCount,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;

  const actions = buildActions({ profile, mySkillIds, registrations });

  return (
    <div className="max-w-[880px] mx-auto pb-12">
      {/* Greeting */}
      <header className="mb-6 mt-2">
        <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold uppercase" style={{ letterSpacing: '0.04em', color: 'var(--c-accent-700)' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--c-accent)' }} />
          {getGreeting()}
        </span>
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight mt-2" style={{ color: 'var(--c-ink)' }}>
          Chào {firstName(user?.name)} 👋
        </h1>
        <p className="text-sm mt-1.5" style={{ color: 'var(--c-ink-2)' }}>
          {actions.length > 0
            ? `Bạn có ${actions.length} ${actions.length === 1 ? 'việc' : 'việc'} cần làm hôm nay`
            : 'Chúc bạn một ngày tốt lành.'}
        </p>
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
        <StatCard icon="fa-clock" tint="primary" num={`${stats.totalHours}h`} label="Giờ tình nguyện" />
        <StatCard icon="fa-calendar-check" tint="success" num={stats.attendedEvents} label="Sự kiện tham gia" />
        <StatCard icon="fa-medal" tint="amber" num={stats.badges} label="Huy hiệu" />
        <StatCard icon="fa-certificate" tint="accent" num={stats.certificates} label="Chứng chỉ" />
      </div>

      {/* Section: Hôm nay */}
      <section className="mb-10">
        <SectionLabel>Hôm nay</SectionLabel>
        {actions.length === 0 ? (
          <div className="card p-5 text-center">
            <p className="text-sm text-warmink-2">
              Bạn không có việc gì gấp. Khám phá sự kiện mới bên dưới.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {actions.map((a, idx) => (
              <ActionRow key={`${a.priority}-${idx}`} {...a} />
            ))}
          </div>
        )}
      </section>

      {/* Section: Sự kiện đề xuất */}
      <section className="mb-10">
        <SectionLabel
          action={<Link to="/events" className="link-inline">Xem tất cả →</Link>}
        >
          Sự kiện đề xuất
        </SectionLabel>

        {recommended.length === 0 ? (
          <div className="card p-5 text-center">
            <p className="text-sm text-warmink-2">Hiện chưa có sự kiện phù hợp với bạn.</p>
            <Link to="/events" className="mt-2 inline-block link-inline">Khám phá tất cả →</Link>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-1 -mx-1 px-1">
            {recommended.map((e) => (
              <EventCardCompact key={e.id} event={e} matchPct={e._matchPct} />
            ))}
            <Link
              to="/events"
              className="flex-shrink-0 w-32 snap-start flex flex-col items-center justify-center text-center p-4 transition-colors no-underline"
              style={{ color: 'inherit', border: '1px dashed var(--c-border-2)', borderRadius: 'var(--radius-card)', background: 'var(--c-surface)' }}
            >
              <i className="fa-solid fa-arrow-right text-base mb-1.5" style={{ color: 'var(--c-ink-3)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--c-ink-2)' }}>Xem tất cả</span>
            </Link>
          </div>
        )}
      </section>

      {/* Section: Hành trình */}
      <section>
        <SectionLabel>Hành trình của bạn</SectionLabel>
        <Link
          to="/profile/passport"
          className="card px-5 py-4 flex items-center gap-4 no-underline transition-colors"
          style={{ color: 'inherit' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--c-border-2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--c-border)'; }}
        >
          <span className="flex items-center justify-center flex-shrink-0" style={{ width: 44, height: 44, borderRadius: 12, ...TINT.primary, fontSize: 17 }}>
            <i className="fa-solid fa-id-card" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[14.5px] font-semibold" style={{ color: 'var(--c-ink)' }}>Hộ chiếu tình nguyện</p>
            <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--c-ink-2)' }}>
              {stats.totalHours}h · {stats.attendedEvents} sự kiện · {stats.badges} huy hiệu · {stats.certificates} chứng chỉ
            </p>
          </div>
          <span className="text-sm font-medium flex-shrink-0" style={{ color: 'var(--c-primary)' }}>Xem hành trình →</span>
        </Link>
      </section>
    </div>
  );
}

function buildActions({ profile, mySkillIds, registrations }) {
  const actions = [];

  // P1 — check-in for events within ±2h before / ~6h after start
  registrations.forEach((r) => {
    if (r.status !== 'Confirmed' || r.isAttended) return;
    if (r.event?.status !== 'Approved') return;
    if (isWithinCheckinWindow(r.event, r.shift)) {
      actions.push({
        priority: 1,
        time: formatTime(r.event.startDate),
        title: `Điểm danh tại "${r.event.title}"`,
        subtitle: r.event.location || 'Sự kiện đang diễn ra',
        cta: 'Điểm danh →',
        href: `/events/${r.eventId}`,
        accent: 'warning',
      });
    }
  });

  // P2 — KYC missing when KYC-required event exists
  const kycPending = profile && profile.kycStatus !== 'Verified';
  const hasKycEvent = registrations.some((r) => r.event?.requiresKyc && r.status !== 'Cancelled');
  if (kycPending && hasKycEvent) {
    actions.push({
      priority: 2,
      icon: 'fa-id-card',
      title: 'Bổ sung KYC để tham gia sự kiện y tế',
      subtitle: 'Một số sự kiện bạn đã đăng ký yêu cầu xác minh danh tính',
      cta: 'Mở hồ sơ →',
      href: '/profile',
      accent: 'warning',
    });
  }

  // P3 — completed events without rating (best-effort: r.event.status === Completed && r.isAttended)
  registrations.forEach((r) => {
    if (!r.isAttended) return;
    if (r.event?.status !== 'Completed') return;
    actions.push({
      priority: 3,
      icon: 'fa-star',
      title: `Đánh giá "${r.event.title}"`,
      subtitle: 'Chia sẻ cảm nhận về ban tổ chức',
      cta: 'Đánh giá →',
      href: '/my-registrations',
      accent: 'neutral',
    });
  });

  // P4 — donation pending > 7 days
  // (data not loaded on home for perf — skip in pilot)

  // P5 — profile completion
  const profileMissing = profile && (!profile.avatarUrl || !profile.bio || mySkillIds.length === 0);
  if (profileMissing) {
    actions.push({
      priority: 5,
      icon: 'fa-user-pen',
      title: 'Hoàn thiện hồ sơ — tăng cơ hội phù hợp với sự kiện',
      subtitle: !profile?.avatarUrl
        ? 'Thêm ảnh đại diện, kỹ năng và mô tả ngắn'
        : 'Cập nhật kỹ năng để được gợi ý sự kiện phù hợp',
      cta: 'Cập nhật →',
      href: '/profile',
      accent: 'neutral',
    });
  }

  return actions.sort((a, b) => a.priority - b.priority).slice(0, 5);
}
