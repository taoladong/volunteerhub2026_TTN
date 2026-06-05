import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { eventApi } from '../../services/api';

const heroImage =
  'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1800&auto=format&fit=crop&q=85';

const roleCards = [
  {
    title: 'Tình nguyện viên',
    description: 'Tìm sự kiện phù hợp, chọn ca tham gia, theo dõi lịch sử đóng góp, huy hiệu và chứng chỉ.',
    icon: 'fa-hand-holding-heart',
    tone: '#1b61c9',
    to: '/events',
  },
  {
    title: 'Ban tổ chức',
    description: 'Tạo sự kiện, duyệt đăng ký, điểm danh bằng QR, quản lý kênh trao đổi và báo cáo.',
    icon: 'fa-calendar-check',
    tone: '#7c3aed',
    to: '/login',
  },
  {
    title: 'Nhà tài trợ',
    description: 'Khám phá chương trình cộng đồng, ghi nhận khoản tài trợ và theo dõi các sự kiện đã đồng hành.',
    icon: 'fa-hand-holding-dollar',
    tone: '#d97706',
    to: '/login',
  },
  {
    title: 'Quản trị viên',
    description: 'Duyệt sự kiện, quản lý người dùng, danh mục, kỹ năng và xuất dữ liệu vận hành.',
    icon: 'fa-shield-halved',
    tone: '#dc2626',
    to: '/login',
  },
];

const steps = [
  {
    title: 'Khám phá',
    text: 'Lọc sự kiện theo chủ đề, địa điểm, kỹ năng và thời gian.',
    icon: 'fa-magnifying-glass-location',
  },
  {
    title: 'Đăng ký',
    text: 'Chọn ca phù hợp, gửi đăng ký và nhận thông báo xác nhận.',
    icon: 'fa-clipboard-check',
  },
  {
    title: 'Ghi nhận',
    text: 'Điểm danh, hoàn thành sự kiện và lưu lại đóng góp bằng chứng chỉ.',
    icon: 'fa-award',
  },
];

const formatDate = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

function FeaturedEventCard({ event }) {
  return (
    <Link
      to={`/events/${event.id}`}
      className="group block overflow-hidden rounded-lg border border-slate-200 bg-white no-underline shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl"
    >
      <div className="relative h-44 overflow-hidden bg-slate-100">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-blue-200">
            <i className="fa-solid fa-calendar-days text-4xl" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/55 to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-blue-700">
          {event.category?.name || 'Sự kiện'}
        </span>
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 min-h-[44px] text-base font-bold leading-snug text-slate-900 group-hover:text-blue-700">
          {event.title}
        </h3>
        <div className="mt-3 space-y-2 text-sm text-slate-600">
          <p className="flex items-center gap-2">
            <i className="fa-solid fa-location-dot w-4 text-blue-600" />
            <span className="truncate">{event.location || 'Chưa cập nhật địa điểm'}</span>
          </p>
          <p className="flex items-center gap-2">
            <i className="fa-regular fa-calendar w-4 text-emerald-600" />
            <span>{formatDate(event.startDate)}</span>
          </p>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <span>
            {event.currentParticipants || 0}/{event.maxParticipants || 0} người tham gia
          </span>
          <span className="font-semibold text-blue-700">Xem chi tiết</span>
        </div>
      </div>
    </Link>
  );
}

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    let mounted = true;

    eventApi
      .getAll({ status: 'Approved', page: 1, pageSize: 6 })
      .then((response) => {
        if (!mounted) return;
        setFeaturedEvents(response.data?.items || []);
      })
      .catch(() => {
        if (!mounted) return;
        setFeaturedEvents([]);
      })
      .finally(() => {
        if (mounted) setLoadingEvents(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const totalSlots = featuredEvents.reduce((sum, event) => sum + (event.maxParticipants || 0), 0);
    const totalParticipants = featuredEvents.reduce((sum, event) => sum + (event.currentParticipants || 0), 0);

    return [
      { label: 'Sự kiện đang mở', value: featuredEvents.length ? `${featuredEvents.length}+` : '...', icon: 'fa-calendar-days' },
      { label: 'Suất tham gia', value: totalSlots ? `${totalSlots}+` : '...', icon: 'fa-users' },
      { label: 'Đã đăng ký', value: totalParticipants ? `${totalParticipants}+` : '...', icon: 'fa-user-check' },
      { label: 'Vai trò hỗ trợ', value: '4', icon: 'fa-layer-group' },
    ];
  }, [featuredEvents]);

  const gatedTarget = isAuthenticated ? '/dashboard' : '/login';

  return (
    <div className="bg-slate-50">
      <section className="relative min-h-[calc(100vh-60px)] overflow-hidden">
        <img src={heroImage} alt="Tình nguyện viên trong hoạt động cộng đồng" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-slate-950/32" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.86)_0%,rgba(2,6,23,0.64)_38%,rgba(2,6,23,0.24)_70%,rgba(2,6,23,0.08)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(248,250,252,0)_0%,rgba(248,250,252,0)_68%,rgb(248,250,252)_100%)]" />

        <div className="relative mx-auto flex min-h-[calc(100vh-60px)] max-w-7xl flex-col justify-center px-5 py-20 sm:px-8">
          <div className="max-w-3xl pt-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-slate-950/45 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur">
              <i className="fa-solid fa-leaf" />
              Hệ sinh thái tình nguyện số
            </div>

            <h1 className="text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl" style={{ textShadow: '0 3px 22px rgba(0, 0, 0, 0.48)' }}>VolunteerHub</h1>
            <p className="mt-5 max-w-2xl text-lg font-medium leading-8 text-white/95" style={{ textShadow: '0 2px 18px rgba(0, 0, 0, 0.55)' }}>
              Kết nối tình nguyện viên, ban tổ chức và nhà tài trợ trong một nền tảng thống nhất: tìm sự kiện,
              đăng ký tham gia, vận hành chương trình, ghi nhận đóng góp và lan tỏa tác động cộng đồng.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/events" className="btn-primary px-5 py-3">
                <i className="fa-solid fa-calendar-days mr-2" />
                Khám phá sự kiện
              </Link>
              <Link
                to={isAuthenticated ? '/dashboard' : '/register'}
                className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-white px-5 py-3 font-bold text-slate-900 no-underline shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50"
              >
                <i className="fa-solid fa-user-plus mr-2 text-blue-700" />
                {isAuthenticated ? 'Vào dashboard' : 'Đăng ký ngay'}
              </Link>
            </div>
          </div>

          <div className="mt-14 grid max-w-5xl grid-cols-2 gap-3 md:grid-cols-4">
            {stats.map((item) => (
              <div key={item.label} className="rounded-lg border border-white/25 bg-slate-950/36 p-4 text-white shadow-lg backdrop-blur">
                <i className={`fa-solid ${item.icon} text-white/60 text-sm`} />
                <div className="mt-1 text-2xl font-extrabold" style={{ textShadow: '0 2px 14px rgba(0, 0, 0, 0.38)' }}>{item.value}</div>
                <div className="mt-1 text-sm font-semibold text-white/90">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">Dành cho mọi vai trò</p>
            <h2 className="mt-2 text-3xl font-extrabold text-slate-900">Một luồng làm việc, nhiều cách tham gia</h2>
          </div>
          <Link to={gatedTarget} className="font-semibold text-blue-700 no-underline hover:underline">
            {isAuthenticated ? 'Mở không gian làm việc' : 'Đăng nhập để bắt đầu'}
          </Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {roleCards.map((role) => (
            <Link
              key={role.title}
              to={role.to === '/login' ? gatedTarget : role.to}
              className="group rounded-lg border border-slate-200 bg-white p-5 no-underline shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-lg"
                style={{ background: `${role.tone}14`, color: role.tone }}
              >
                <i className={`fa-solid ${role.icon} text-lg`} />
              </div>
              <h3 className="mt-5 text-lg font-bold text-slate-900 group-hover:text-blue-700">{role.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{role.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Quy trình</p>
            <h2 className="mt-2 text-3xl font-extrabold text-slate-900">Từ ý định tốt đến đóng góp được ghi nhận</h2>
            <p className="mt-4 leading-7 text-slate-600">
              VolunteerHub không chỉ là danh sách sự kiện. Nền tảng giữ trọn mạch nghiệp vụ từ khám phá, đăng ký,
              xác nhận, điểm danh đến chứng chỉ sau chương trình.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <i className={`fa-solid ${step.icon}`} />
                  </div>
                  <span className="text-sm font-bold text-slate-300">0{index + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">Sự kiện nổi bật</p>
            <h2 className="mt-2 text-3xl font-extrabold text-slate-900">Các chương trình đang mở</h2>
          </div>
          <Link to="/events" className="font-semibold text-blue-700 no-underline hover:underline">
            Xem toàn bộ sự kiện
          </Link>
        </div>

        {loadingEvents ? (
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-72 animate-pulse rounded-lg bg-slate-200" />
            ))}
          </div>
        ) : featuredEvents.length > 0 ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {featuredEvents.slice(0, 6).map((event) => (
              <FeaturedEventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
            <i className="fa-regular fa-calendar text-3xl text-slate-300" />
            <p className="mt-3 font-semibold text-slate-700">Chưa có sự kiện đang mở để hiển thị.</p>
            <p className="mt-1 text-sm text-slate-500">Hãy đăng nhập bằng tài khoản ban tổ chức để tạo sự kiện mới.</p>
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700">
        <div className="mx-auto max-w-4xl px-5 py-16 text-center sm:px-8">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">Sẵn sàng tạo tác động?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-blue-100">
            Dù bạn là tình nguyện viên muốn đóng góp, ban tổ chức cần nhân sự, hay nhà tài trợ tìm chương trình ý nghĩa — VolunteerHub là nơi bắt đầu.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to={isAuthenticated ? '/dashboard' : '/register'} className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 font-bold text-blue-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50 no-underline">
              <i className="fa-solid fa-rocket mr-2" />
              {isAuthenticated ? 'Vào dashboard' : 'Tạo tài khoản miễn phí'}
            </Link>
            <Link to="/events" className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/10 px-6 py-3 font-bold text-white shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20 no-underline">
              <i className="fa-solid fa-compass mr-2" />
              Khám phá sự kiện
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
