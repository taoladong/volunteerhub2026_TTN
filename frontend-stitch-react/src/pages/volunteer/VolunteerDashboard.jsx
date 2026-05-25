import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { eventApi, dashboardApi, profileApi } from '../../services/api';
import Icon from '../../components/common/Icon';
import Loading from '../../components/common/Loading';

const MONTHLY_TARGET = 20;

export default function VolunteerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const normalizeEvents = (payload) => {
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.items)) return payload.items;
      if (Array.isArray(payload?.data)) return payload.data;
      return [];
    };

    const fetchData = async () => {
      try {
        const [dashRes, recRes] = await Promise.all([
          dashboardApi.get().catch(() => ({ data: null })),
          eventApi.getRecommended().catch(() => ({ data: [] })),
        ]);

        setStats(dashRes.data);

        let recommendedItems = normalizeEvents(recRes.data);

        if (recommendedItems.length === 0) {
          const fallbackRes = await eventApi.getAll({
            status: 'Approved',
            page: 1,
            pageSize: 4,
          }).catch(() => ({ data: [] }));

          recommendedItems = normalizeEvents(fallbackRes.data);
        }

        setRecommended(recommendedItems.slice(0, 4));
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return <Loading />;

  const totalHours = Number(stats?.totalHours || 0);
  const totalEvents = Number(stats?.totalEvents || 0);
  const totalBadges = Number(stats?.totalBadges || 0);
  const monthlyHours = Number(stats?.monthlyHours || 0);
  const monthlyProgress = Math.min(100, Math.round((monthlyHours / MONTHLY_TARGET) * 100));
  const averageHoursPerEvent = totalEvents > 0 ? (totalHours / totalEvents).toFixed(1) : '0.0';

  const activityBars = [
    {
      label: 'Giờ tháng này',
      value: monthlyHours,
      max: Math.max(MONTHLY_TARGET, monthlyHours, 1),
      color: 'from-teal-400 to-cyan-500',
      note: `${monthlyHours}/${MONTHLY_TARGET} giờ mục tiêu`,
    },
    {
      label: 'Tổng sự kiện',
      value: totalEvents,
      max: Math.max(totalEvents, totalBadges, 1),
      color: 'from-primary to-indigo-500',
      note: `${totalEvents} sự kiện đã tham gia`,
    },
    {
      label: 'Tổng huy hiệu',
      value: totalBadges,
      max: Math.max(totalEvents, totalBadges, 1),
      color: 'from-amber-400 to-orange-500',
      note: `${totalBadges} huy hiệu đã nhận`,
    },
  ];

  const reportHighlights = [
    {
      icon: 'insights',
      title: 'Hiệu suất trung bình',
      value: `${averageHoursPerEvent} giờ/sự kiện`,
      description: 'Thể hiện mức độ đóng góp trung bình của bạn trong mỗi hoạt động.',
    },
    {
      icon: 'track_changes',
      title: 'Tiến độ mục tiêu tháng',
      value: `${monthlyProgress}%`,
      description: monthlyProgress >= 100
        ? 'Bạn đã hoàn thành mục tiêu tháng và có thể đặt cột mốc cao hơn.'
        : `Bạn còn ${Math.max(MONTHLY_TARGET - monthlyHours, 0)} giờ để đạt mục tiêu tháng này.`,
    },
    {
      icon: 'workspace_premium',
      title: 'Mức độ ghi nhận',
      value: `${totalBadges} huy hiệu`,
      description: totalBadges > 0
        ? 'Các huy hiệu phản ánh mức độ tin cậy và đóng góp của bạn.'
        : 'Hãy tiếp tục tham gia hoạt động để nhận huy hiệu đầu tiên.',
    },
  ];

  return (
    <div className="space-y-10">
      {/* Welcome Section */}
      <section className="bg-gradient-to-br from-primary-container via-white to-teal-50 rounded-[2rem] border border-outline p-8 shadow-card overflow-hidden relative">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-extrabold text-on-surface tracking-tight">
              Xin chào, {user?.fullName || 'Bạn'}!
            </h2>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/su-kien" className="btn-primary flex items-center gap-2">
              <Icon name="explore" size={20} />
              Khám phá sự kiện
            </Link>
            <Link to="/ho-so" className="btn-secondary flex items-center gap-2">
              <Icon name="person" size={20} />
              Cập nhật hồ sơ
            </Link>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
      </section>

      {/* Report Section */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 bg-white rounded-[2rem] border border-outline p-6 shadow-card">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-2xl font-extrabold text-on-surface">Báo cáo hoạt động</h3>
              <p className="text-sm text-on-surface-variant mt-1">Biểu đồ tóm tắt tiến độ và mức độ tham gia của bạn.</p>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-widest font-bold text-primary">Cập nhật hiện tại</div>
              <div className="text-lg font-extrabold text-on-surface">{totalHours} giờ tình nguyện</div>
            </div>
          </div>

          <div className="space-y-5">
            {activityBars.map((item) => {
              const percent = Math.max(8, Math.min(100, Math.round((item.value / item.max) * 100)));
              return (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-on-surface">{item.label}</div>
                      <div className="text-sm text-on-surface-variant">{item.note}</div>
                    </div>
                    <div className="text-xl font-extrabold text-on-surface">{item.value}</div>
                  </div>
                  <div className="h-3 rounded-full bg-surface-variant overflow-hidden">
                    <div className={`h-full rounded-full bg-gradient-to-r ${item.color}`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="xl:col-span-5 bg-white rounded-[2rem] border border-outline p-6 shadow-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-extrabold text-on-surface">Mức hoàn thành</h3>
              <p className="text-sm text-on-surface-variant mt-1">Tỷ lệ chạm mục tiêu tình nguyện trong tháng.</p>
            </div>
            <Icon name="donut_large" className="text-primary" size={24} />
          </div>

          <div className="flex flex-col items-center justify-center gap-5">
            <div
              className="relative h-44 w-44 rounded-full flex items-center justify-center"
              style={{
                background: `conic-gradient(#14b8a6 0% ${monthlyProgress}%, #e5e7eb ${monthlyProgress}% 100%)`,
              }}
            >
              <div className="h-32 w-32 rounded-full bg-white flex flex-col items-center justify-center shadow-inner">
                <span className="text-4xl font-extrabold text-on-surface">{monthlyProgress}%</span>
                <span className="text-xs uppercase tracking-widest text-on-surface-variant font-bold mt-1">Hoàn thành</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 w-full">
              {reportHighlights.map((item) => (
                <div key={item.title} className="rounded-2xl bg-surface/60 border border-outline px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-primary-container text-primary flex items-center justify-center shrink-0">
                      <Icon name={item.icon} size={22} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-on-surface">{item.title}</div>
                      <div className="text-lg font-extrabold text-primary">{item.value}</div>
                    </div>
                  </div>
                  <p className="text-sm text-on-surface-variant mt-2">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Recommended Events */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-extrabold text-on-surface">Đề xuất cho bạn</h3>
          <Link to="/su-kien" className="text-primary font-bold text-sm px-4 py-2 hover:bg-primary-container rounded-xl transition-all">
            Xem tất cả
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recommended.length > 0 ? recommended.map((event) => (
            <Link
              key={event.id}
              to={`/su-kien/${event.id}`}
              className="bg-white rounded-[2rem] overflow-hidden border border-outline shadow-card hover:-translate-y-1 transition-all group"
            >
              <div className="h-48 relative bg-primary-container">
                {event.bannerUrl && (
                  <img src={event.bannerUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                )}
                {event.categoryName && (
                  <div className="absolute top-4 left-4 bg-primary/90 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest shadow-lg">
                    {event.categoryName}
                  </div>
                )}
              </div>
              <div className="p-6 space-y-4">
                <h4 className="text-xl font-bold text-on-surface group-hover:text-primary transition-colors">{event.title}</h4>
                <div className="space-y-2">
                  {event.location && (
                    <div className="flex items-center gap-3 text-sm text-on-surface-variant">
                      <Icon name="location_on" className="text-primary" size={18} />
                      <span className="font-medium">{event.location}</span>
                    </div>
                  )}
                  {event.startDate && (
                    <div className="flex items-center gap-3 text-sm text-on-surface-variant">
                      <Icon name="calendar_today" className="text-primary" size={18} />
                      <span className="font-medium">{new Date(event.startDate).toLocaleDateString('vi-VN')}</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          )) : (
            <div className="col-span-2 text-center py-12 text-on-surface-variant">
              <Icon name="event" size={48} className="text-outline mb-4" />
              <p>Chưa có sự kiện phù hợp để hiển thị lúc này.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}