import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { eventApi } from '../../services/api';
import EventCardLarge from '../../components/ui/EventCardLarge';
import EmptyState from '../../components/ui/EmptyState';

/* ───────── Data ───────── */

const TINT = {
  primary: { background: 'var(--c-primary-50)', color: 'var(--c-primary-700)' },
  accent: { background: 'var(--c-accent-50)', color: 'var(--c-accent-700)' },
  amber: { background: 'var(--c-amber-50)', color: 'var(--c-amber)' },
  success: { background: 'var(--c-success-50)', color: 'var(--c-success)' },
};

const VALUE_PROPS = [
  {
    icon: 'fa-wand-magic-sparkles',
    tint: 'primary',
    title: 'Phù hợp với kỹ năng',
    desc: 'Gợi ý sự kiện theo kỹ năng và khu vực, đo độ phù hợp theo phần trăm để bạn chọn nhanh.',
  },
  {
    icon: 'fa-qrcode',
    tint: 'accent',
    title: 'Minh bạch giờ tình nguyện',
    desc: 'Điểm danh QR / GPS tại địa điểm, ban tổ chức xác nhận giờ — không thể giả mạo.',
  },
  {
    icon: 'fa-award',
    tint: 'amber',
    title: 'Ghi nhận có giá trị',
    desc: 'Huy hiệu, chứng chỉ tải PDF, link verify công khai để chứng minh đóng góp của bạn.',
  },
];

const STATS = [
  ['2.400+', 'Tình nguyện viên'],
  ['320', 'Sự kiện'],
  ['18.920', 'Giờ tình nguyện'],
  ['1.150', 'Chứng chỉ'],
];

const ROLE_TABS = [
  {
    key: 'volunteer',
    label: 'Tình nguyện viên',
    icon: 'fa-hand-holding-heart',
    headline: 'Tìm sự kiện, đăng ký, nhận ghi nhận',
    bullets: [
      'Lọc sự kiện theo kỹ năng, địa điểm và lịch rảnh',
      'Đăng ký nhanh, chọn ca, theo dõi trạng thái duyệt',
      'Điểm danh QR/GPS, nhận giờ tình nguyện + chứng chỉ',
    ],
    cta: 'Đăng ký với vai trò Tình nguyện viên',
    ctaHref: '/register?role=volunteer',
    image: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&fit=crop&q=80',
  },
  {
    key: 'organizer',
    label: 'Ban tổ chức',
    icon: 'fa-calendar-check',
    headline: 'Tổ chức sự kiện chuyên nghiệp',
    bullets: [
      'Tạo sự kiện, mở ca làm việc, đặt yêu cầu kỹ năng',
      'Duyệt đăng ký, walk-in, đổi ca, điểm danh tập thể',
      'Báo cáo tác động: giờ TNV, ngân sách, chứng chỉ tự động',
    ],
    cta: 'Đăng ký với vai trò Ban tổ chức',
    ctaHref: '/register?role=organizer',
    image: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=800&fit=crop&q=80',
  },
  {
    key: 'sponsor',
    label: 'Nhà tài trợ',
    icon: 'fa-hand-holding-dollar',
    headline: 'Đồng hành với chương trình ý nghĩa',
    bullets: [
      'Khám phá chương trình theo lĩnh vực và quy mô',
      'Ghi nhận khoản tài trợ minh bạch với báo cáo sử dụng',
      'Theo dõi tác động truyền thông và tổng giờ đóng góp',
    ],
    cta: 'Đăng ký với vai trò Nhà tài trợ',
    ctaHref: '/register?role=sponsor',
    image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&fit=crop&q=80',
  },
];

const STEPS = [
  { n: '01', icon: 'fa-compass', title: 'Khám phá', desc: 'Lọc theo kỹ năng, thời gian, địa điểm. Xem mức độ phù hợp với hồ sơ của bạn.' },
  { n: '02', icon: 'fa-paper-plane', title: 'Đăng ký', desc: 'Chọn ca, gửi đăng ký, theo dõi trạng thái duyệt và thông báo realtime.' },
  { n: '03', icon: 'fa-medal', title: 'Tham gia & ghi nhận', desc: 'Điểm danh QR / GPS tại địa điểm, nhận giờ tình nguyện + huy hiệu + chứng chỉ.' },
];

/* ───────── Bits ───────── */

function Eyebrow({ children }) {
  return (
    <span
      className="inline-flex items-center gap-2 text-[12.5px] font-semibold uppercase"
      style={{ letterSpacing: '0.04em', color: 'var(--c-accent-700)' }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--c-accent)' }} />
      {children}
    </span>
  );
}

/* ───────── Page ───────── */

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [activeRole, setActiveRole] = useState('volunteer');

  useEffect(() => {
    let mounted = true;
    eventApi
      .getAll({ status: 'Approved', page: 1, pageSize: 6 })
      .then((response) => { if (mounted) setFeaturedEvents(response.data?.items || []); })
      .catch(() => { if (mounted) setFeaturedEvents([]); })
      .finally(() => { if (mounted) setLoadingEvents(false); });
    return () => { mounted = false; };
  }, []);

  const scrollToHow = (e) => {
    e.preventDefault();
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const activeRoleData = ROLE_TABS.find((r) => r.key === activeRole) || ROLE_TABS[0];

  return (
    <div style={{ background: 'var(--c-canvas)' }}>
      {/* ══════════ HERO ══════════ */}
      <section className="relative overflow-hidden">
        <div
          className="absolute pointer-events-none"
          style={{ top: -160, right: -120, width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, rgba(240,97,47,0.10) 0%, transparent 70%)' }}
        />
        <div className="relative max-w-6xl mx-auto px-5 sm:px-8 pt-14 pb-14 lg:pt-16 lg:pb-16">
          <div className="grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">
            {/* Left: copy */}
            <div className="max-w-xl">
              <Eyebrow>Nền tảng tình nguyện cộng đồng</Eyebrow>
              <h1
                className="mt-4 text-4xl sm:text-5xl lg:text-[54px] font-semibold leading-[1.08]"
                style={{ letterSpacing: '-0.02em', color: 'var(--c-ink)' }}
              >
                Mỗi giờ bạn trao đi, đều được{' '}
                <span style={{ color: 'var(--c-primary)' }}>ghi nhận</span>.
              </h1>
              <p className="mt-5 text-[17px] leading-relaxed" style={{ color: 'var(--c-ink-2)' }}>
                Tìm sự kiện phù hợp với kỹ năng, đăng ký trong 30 giây, điểm danh QR/GPS
                và nhận chứng chỉ chính thức sau mỗi chương trình.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link to="/events" className="btn-primary no-underline">
                  Khám phá sự kiện <i className="fa-solid fa-arrow-right text-xs" />
                </Link>
                <Link to={isAuthenticated ? '/dashboard' : '/register'} className="btn-ghost no-underline">
                  {isAuthenticated ? 'Vào không gian làm việc' : 'Tham gia ngay'}
                </Link>
              </div>
              <div className="mt-7 flex items-center gap-3">
                <a href="#how-it-works" onClick={scrollToHow} className="text-sm font-medium inline-flex items-center gap-1.5" style={{ color: 'var(--c-ink-2)', textDecoration: 'none' }}>
                  Cách hoạt động <i className="fa-solid fa-arrow-down text-[10px]" />
                </a>
              </div>
            </div>

            {/* Right: collage with floating stat chip */}
            <div className="relative hidden lg:block" style={{ height: 420 }}>
              <div
                className="absolute overflow-hidden"
                style={{ top: 0, left: 0, width: '76%', height: 300, borderRadius: 22, border: '5px solid #fff', boxShadow: 'var(--shadow-card-h)', transform: 'rotate(-2deg)' }}
              >
                <img src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=720&q=80" alt="" className="w-full h-full object-cover" />
              </div>
              <div
                className="absolute overflow-hidden"
                style={{ bottom: 0, right: 0, width: '52%', height: 220, borderRadius: 20, border: '5px solid #fff', boxShadow: 'var(--shadow-card-h)', transform: 'rotate(3deg)' }}
              >
                <img src="https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=520&q=80" alt="" className="w-full h-full object-cover" />
              </div>
              <div className="card flex items-center gap-3" style={{ position: 'absolute', top: 24, right: -8, padding: '12px 16px', borderRadius: 16 }}>
                <span className="flex items-center justify-center" style={{ width: 38, height: 38, borderRadius: 11, ...TINT.success, fontSize: 15 }}>
                  <i className="fa-solid fa-clock" />
                </span>
                <div>
                  <div className="text-[18px] font-bold leading-none" style={{ color: 'var(--c-ink)' }}>18.920</div>
                  <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--c-ink-2)' }}>giờ đã ghi nhận</div>
                </div>
              </div>
            </div>

            {/* Mobile hero image */}
            <div className="lg:hidden overflow-hidden" style={{ borderRadius: 20, border: '4px solid #fff', boxShadow: 'var(--shadow-card-h)', height: 200 }}>
              <img src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=720&q=80" alt="" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ STATS BAND ══════════ */}
      <section style={{ background: 'var(--c-surface)', borderTop: '1px solid var(--c-border)', borderBottom: '1px solid var(--c-border)' }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map(([n, l]) => (
              <div key={l} className="text-center">
                <div className="text-[28px] font-semibold" style={{ color: 'var(--c-primary)', letterSpacing: '-0.02em' }}>{n}</div>
                <div className="text-[13px] mt-0.5" style={{ color: 'var(--c-ink-2)' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ VALUE PROPS ══════════ */}
      <section>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-16 pb-2">
          <Eyebrow>Tại sao VolunteerHub</Eyebrow>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold leading-tight" style={{ letterSpacing: '-0.02em', color: 'var(--c-ink)', maxWidth: 540 }}>
            Trải nghiệm tình nguyện rõ ràng từ đầu tới cuối
          </h2>
          <div className="mt-9 grid md:grid-cols-3 gap-6">
            {VALUE_PROPS.map((p) => (
              <div key={p.title} className="card" style={{ padding: 24 }}>
                <span className="flex items-center justify-center" style={{ width: 46, height: 46, borderRadius: 13, ...TINT[p.tint], fontSize: 18 }}>
                  <i className={`fa-solid ${p.icon}`} />
                </span>
                <h3 className="mt-4 text-[17px] font-semibold" style={{ color: 'var(--c-ink)' }}>{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--c-ink-2)' }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ ROLE PATHS ══════════ */}
      <section>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-16 pb-2">
          <Eyebrow>Cho mọi vai trò</Eyebrow>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold leading-tight" style={{ letterSpacing: '-0.02em', color: 'var(--c-ink)' }}>
            Một nền tảng, ba hành trình
          </h2>

          <div className="mt-8 flex flex-wrap gap-1" style={{ borderBottom: '1px solid var(--c-border)' }}>
            {ROLE_TABS.map((tab) => {
              const active = activeRole === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveRole(tab.key)}
                  className="relative inline-flex items-center gap-2 px-4 py-3 text-sm transition-colors"
                  style={{ color: active ? 'var(--c-primary-700)' : 'var(--c-ink-2)', fontWeight: active ? 600 : 500 }}
                >
                  <i className={`fa-solid ${tab.icon} text-xs`} style={{ color: active ? 'var(--c-primary)' : 'var(--c-ink-3)' }} />
                  {tab.label}
                  {active && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full" style={{ background: 'var(--c-primary)' }} />}
                </button>
              );
            })}
          </div>

          <div className="mt-9 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <h3 className="text-2xl sm:text-3xl font-semibold leading-tight" style={{ letterSpacing: '-0.02em', color: 'var(--c-ink)' }}>
                {activeRoleData.headline}
              </h3>
              <ul className="mt-6 space-y-3">
                {activeRoleData.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm leading-relaxed" style={{ color: 'var(--c-ink)' }}>
                    <span className="mt-1 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center" style={{ ...TINT.success }}>
                      <i className="fa-solid fa-check text-[9px]" />
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <Link
                to={isAuthenticated ? '/dashboard' : activeRoleData.ctaHref}
                className="mt-8 inline-flex items-center gap-2 text-sm font-semibold no-underline"
                style={{ color: 'var(--c-primary)' }}
              >
                {isAuthenticated ? 'Mở không gian làm việc' : activeRoleData.cta}
                <i className="fa-solid fa-arrow-right text-[10px]" />
              </Link>
            </div>

            <div className="overflow-hidden" style={{ borderRadius: 'var(--radius-card)', border: '1px solid var(--c-border)', boxShadow: 'var(--shadow-card)' }}>
              <img
                key={activeRoleData.key}
                src={activeRoleData.image}
                alt={activeRoleData.label}
                className="w-full h-[280px] object-cover block"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ FEATURED EVENTS ══════════ */}
      <section>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-16 pb-2">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-7">
            <div>
              <Eyebrow>Đang diễn ra</Eyebrow>
              <h2 className="mt-3 text-3xl sm:text-4xl font-semibold leading-tight" style={{ letterSpacing: '-0.02em', color: 'var(--c-ink)' }}>
                Sự kiện mới từ cộng đồng
              </h2>
            </div>
            <Link to="/events" className="btn-ghost btn-sm no-underline">
              Xem tất cả <i className="fa-solid fa-arrow-right text-[10px]" />
            </Link>
          </div>

          {loadingEvents ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-72 animate-pulse rounded-card" style={{ background: 'var(--c-surface-2)' }} />
              ))}
            </div>
          ) : featuredEvents.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {featuredEvents.slice(0, 6).map((event) => (
                <EventCardLarge key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="fa-calendar"
              title="Chưa có sự kiện đang mở"
              description="Hãy đăng nhập bằng tài khoản ban tổ chức để tạo sự kiện mới hoặc quay lại sau."
              cta="Đi tới trang sự kiện"
              ctaTo="/events"
            />
          )}
        </div>
      </section>

      {/* ══════════ HOW IT WORKS ══════════ */}
      <section id="how-it-works">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-16 pb-2">
          <Eyebrow>Quy trình</Eyebrow>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold leading-tight" style={{ letterSpacing: '-0.02em', color: 'var(--c-ink)' }}>
            3 bước để bắt đầu
          </h2>
          <div className="mt-9 grid md:grid-cols-3 gap-6">
            {STEPS.map((s) => (
              <div key={s.n} className="card relative" style={{ padding: 24 }}>
                <div className="absolute font-bold" style={{ top: 20, right: 22, fontSize: 38, color: 'var(--c-surface-2)' }}>{s.n}</div>
                <span className="flex items-center justify-center" style={{ width: 46, height: 46, borderRadius: 13, ...TINT.primary, fontSize: 18 }}>
                  <i className={`fa-solid ${s.icon}`} />
                </span>
                <h3 className="mt-4 text-[17px] font-semibold" style={{ color: 'var(--c-ink)' }}>{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--c-ink-2)' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ CTA BAND ══════════ */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div
            className="relative overflow-hidden text-center"
            style={{ borderRadius: 26, padding: 'clamp(40px,5vw,56px) clamp(24px,4vw,48px)', background: 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-800) 100%)' }}
          >
            <div style={{ position: 'absolute', top: -80, right: -60, width: 320, height: 320, borderRadius: '50%', background: 'rgba(240,97,47,0.30)' }} />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-semibold leading-tight" style={{ letterSpacing: '-0.02em', color: '#fff' }}>
                Sẵn sàng bắt đầu hành trình tình nguyện?
              </h2>
              <p className="mt-3 text-base" style={{ color: 'rgba(255,255,255,0.82)' }}>
                Đăng ký miễn phí — chỉ mất 30 giây.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <Link to={isAuthenticated ? '/dashboard' : '/register'} className="btn-accent no-underline">
                  {isAuthenticated ? 'Vào dashboard' : 'Tạo tài khoản miễn phí'} <i className="fa-solid fa-arrow-right text-xs" />
                </Link>
                <Link
                  to="/events"
                  className="inline-flex items-center gap-2 no-underline font-semibold text-[14.5px]"
                  style={{ padding: '11px 20px', borderRadius: 'var(--radius-btn)', background: 'rgba(255,255,255,0.14)', color: '#fff' }}
                >
                  Xem sự kiện trước
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
