import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi, eventApi } from '../../services/api';
import Icon from '../../components/common/Icon';
import Loading from '../../components/common/Loading';

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
const compactNumber = new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 });

function formatDate(value) {
  if (!value) return 'Chưa xác định';
  return new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function normalizeStatus(status) {
  return String(status || 'Draft').trim();
}

function isUpcomingEvent(event) {
  return event?.startDate && new Date(event.startDate) > new Date() && normalizeStatus(event.status) === 'Approved';
}

function getEventCapacity(event) {
  return Number(event?.maxParticipants || event?.capacity || 0);
}

function getEventParticipants(event) {
  return Number(event?.currentParticipants || event?.confirmedParticipants || event?.participantCount || 0);
}

function buildLocalEventStats(events) {
  const allEvents = Array.isArray(events) ? events : [];
  const statusCounts = allEvents.reduce((acc, event) => {
    const status = normalizeStatus(event.status);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const totalCapacity = allEvents.reduce((sum, event) => sum + getEventCapacity(event), 0);
  const currentParticipants = allEvents.reduce((sum, event) => sum + getEventParticipants(event), 0);

  return {
    totalEvents: allEvents.length,
    approvedEvents: statusCounts.Approved || 0,
    completedEvents: statusCounts.Completed || 0,
    pendingEvents: statusCounts.Pending || 0,
    rejectedEvents: statusCounts.Rejected || 0,
    cancelledEvents: statusCounts.Cancelled || 0,
    upcomingEvents: allEvents.filter(isUpcomingEvent).length,
    totalCapacity,
    currentParticipants,
    capacityFillRate: totalCapacity ? Math.round((currentParticipants * 100) / totalCapacity) : 0,
  };
}

function StatCard({ icon, label, value, hint, accent = 'from-primary to-tertiary', tone = 'text-primary' }) {
  return (
    <div className="relative overflow-hidden bg-white p-6 rounded-3xl shadow-soft border border-outline">
      <div className={`absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${accent} opacity-10`} />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-label-sm uppercase tracking-wide text-on-surface-variant font-bold">{label}</p>
          <div className="mt-2 text-3xl font-black text-on-surface">{value}</div>
          {hint && <p className="mt-2 text-label-md text-on-surface-variant">{hint}</p>}
        </div>
        <div className={`w-12 h-12 rounded-2xl bg-surface-variant flex items-center justify-center ${tone}`}>
          <Icon name={icon} size={26} />
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ value, color = 'bg-primary', label }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div>
      <div className="flex items-center justify-between text-label-sm mb-2">
        <span className="font-semibold text-on-surface">{label}</span>
        <span className="text-on-surface-variant">{safeValue}%</span>
      </div>
      <div className="h-3 bg-surface-variant rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}

function BarChart({ items, valueKey, labelKey = 'title', color = 'bg-primary', valueFormatter = (v) => v }) {
  const maxValue = Math.max(...items.map(item => Number(item[valueKey]) || 0), 1);
  return (
    <div className="space-y-4">
      {items.length ? items.map((item, index) => {
        const value = Number(item[valueKey]) || 0;
        const width = Math.max(4, (value / maxValue) * 100);
        return (
          <div key={item.id || item[labelKey] || index}>
            <div className="flex items-center justify-between gap-4 text-label-sm mb-2">
              <span className="font-semibold text-on-surface truncate">{item[labelKey]}</span>
              <span className="text-on-surface-variant flex-shrink-0">{valueFormatter(value)}</span>
            </div>
            <div className="h-3 rounded-full bg-surface-variant overflow-hidden">
              <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      }) : (
        <p className="text-on-surface-variant text-center py-8">Chưa đủ dữ liệu để vẽ biểu đồ</p>
      )}
    </div>
  );
}

function FunnelStep({ icon, label, value, width, color }) {
  return (
    <div className="relative">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-white/80 flex items-center justify-center text-primary">
          <Icon name={icon} size={20} />
        </div>
        <div>
          <p className="text-sm font-bold text-on-surface">{label}</p>
          <p className="text-xl font-black text-on-surface">{value}</p>
        </div>
      </div>
      <div className="h-10 bg-surface-variant rounded-2xl overflow-hidden">
        <div className={`h-full rounded-2xl ${color} flex items-center justify-end pr-3 text-white text-label-sm font-bold`} style={{ width: `${width}%` }}>
          {width}%
        </div>
      </div>
    </div>
  );
}

function EmptyIllustration() {
  return (
    <div className="py-10 text-center">
      <div className="mx-auto w-28 h-28 rounded-full bg-primary-container flex items-center justify-center mb-4 relative">
        <Icon name="event_available" size={46} className="text-primary" />
        <span className="absolute -right-2 top-4 w-8 h-8 rounded-full bg-tertiary-container flex items-center justify-center">
          <Icon name="add" size={18} className="text-tertiary" />
        </span>
      </div>
      <p className="font-bold text-on-surface">Chưa có sự kiện nào</p>
      <p className="text-on-surface-variant mt-1">Tạo sự kiện đầu tiên để bắt đầu xem báo cáo tổng quan.</p>
    </div>
  );
}

export default function OrganizerDashboard() {
  const [insights, setInsights] = useState(null);
  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardApi.getOrganizerInsights().catch(() => ({ data: null })),
      eventApi.getMine().catch(() => ({ data: [] })),
    ]).then(([insRes, evRes]) => {
      setInsights(insRes.data);
      const events = Array.isArray(evRes.data) ? evRes.data : evRes.data?.items || [];
      setMyEvents(events);
    }).finally(() => setLoading(false));
  }, []);

  const report = useMemo(() => {
    const localStats = buildLocalEventStats(myEvents);
    const totals = insights?.totals || {};
    const funnel = insights?.funnel || {};
    const categoryBreakdown = insights?.categoryBreakdown || [];
    const topVolunteers = insights?.topEventsByVolunteers || [];
    const topHours = insights?.topEventsByHours || [];
    const financialByEvent = insights?.financialByEvent || [];
    const recentEvents = insights?.recentEvents?.length ? insights.recentEvents : myEvents.slice(0, 6);

    const totalEvents = totals.events ?? insights?.totalEvents ?? localStats.totalEvents;
    const confirmedRegistrations = totals.confirmedRegistrations ?? localStats.currentParticipants;
    const totalCapacity = totals.totalCapacity ?? localStats.totalCapacity;
    const totalFinancial = totals.financialConfirmedAmount || 0;
    const confirmationRate = Number(totals.confirmationRate || 0);
    const attendanceRate = Number(totals.attendanceRate || 0);
    const capacityFillRate = Number(totals.capacityFillRate ?? localStats.capacityFillRate ?? 0);
    const pendingRegistrations = totals.pendingRegistrations || 0;
    const pendingEvents = totals.pendingEvents ?? localStats.pendingEvents;
    const lowAttendanceEvents = topVolunteers.filter(event => Number(event.confirmed || 0) > 0 && Number(event.attendanceRate || 0) < 70).length;

    return {
      totals: {
        ...totals,
        approvedEvents: totals.approvedEvents ?? localStats.approvedEvents,
        completedEvents: totals.completedEvents ?? localStats.completedEvents,
        pendingEvents,
        rejectedEvents: totals.rejectedEvents ?? localStats.rejectedEvents,
        cancelledEvents: totals.cancelledEvents ?? localStats.cancelledEvents,
        confirmedRegistrations,
        totalCapacity,
      },
      funnel,
      categoryBreakdown,
      topVolunteers,
      topHours,
      financialByEvent,
      recentEvents,
      totalEvents,
      totalFinancial,
      confirmationRate,
      attendanceRate,
      capacityFillRate,
      upcomingCount: totals.upcomingEvents ?? localStats.upcomingEvents,
      attentionCount: pendingEvents + pendingRegistrations + lowAttendanceEvents,
      healthScore: Math.round((confirmationRate * 0.35) + (attendanceRate * 0.45) + (Math.min(100, capacityFillRate) * 0.2)),
    };
  }, [insights, myEvents]);

  const funnelBase = Math.max(report.funnel.registrations || 0, 1);
  const funnelConfirmed = Math.round(((report.funnel.confirmed || 0) / funnelBase) * 100);
  const funnelAttended = Math.round(((report.funnel.attended || 0) / funnelBase) * 100);
  const funnelCertificates = Math.round(((report.funnel.certificates || 0) / funnelBase) * 100);

  if (loading) return <Loading />;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-blue-600 to-tertiary p-8 md:p-10 text-white shadow-soft">
        <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-white/10 translate-x-16 -translate-y-16" />
        <div className="absolute right-20 bottom-0 h-32 w-32 rounded-full bg-white/10 translate-y-16" />
        <div className="relative grid lg:grid-cols-[1fr_360px] gap-8 items-center">
          <div>
            <h2 className="mt-5 text-3xl md:text-5xl font-black leading-tight">
              Tổng quan hiệu quả tổ chức sự kiện
            </h2>
              <p className="mt-4 text-white/85 text-lg max-w-2xl">
                Dashboard chỉ tổng hợp dữ liệu thuộc sự kiện của bạn: đăng ký, tỷ lệ lấp đầy, điểm danh, chứng chỉ và nguồn lực đã xác nhận.
              </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/quan-ly-su-kien" className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-primary font-bold shadow-soft hover:bg-white/90 transition-colors">
                <Icon name="add" size={20} />
                Tạo sự kiện mới
              </Link>
              <Link to="/quan-ly-dang-ky-diem-danh" className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/15 text-white font-bold hover:bg-white/25 transition-colors">
                <Icon name="how_to_reg" size={20} />
                Duyệt đăng ký
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="bg-white/15 backdrop-blur rounded-3xl p-6 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/75 text-sm">Sức khỏe vận hành</p>
                  <p className="text-4xl font-black mt-1">{report.healthScore}%</p>
                </div>
                <div className="w-16 h-16 rounded-3xl bg-white/20 flex items-center justify-center">
                  <Icon name="insights" size={34} />
                </div>
              </div>
              <div className="mt-5 space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Tỷ lệ xác nhận</span>
                    <span>{report.confirmationRate}%</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full" style={{ width: `${Math.min(100, report.confirmationRate)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Lấp đầy chỉ tiêu</span>
                    <span>{report.capacityFillRate}%</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-green-300 rounded-full" style={{ width: `${Math.min(100, report.capacityFillRate)}%` }} />
                  </div>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/15 p-4">
                  <p className="text-xs text-white/70">Sắp diễn ra</p>
                  <p className="text-2xl font-black">{report.upcomingCount}</p>
                </div>
                <div className="rounded-2xl bg-white/15 p-4">
                  <p className="text-xs text-white/70">Cần xử lý</p>
                  <p className="text-2xl font-black">{report.attentionCount}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon="event" label="Danh mục sự kiện" value={report.totalEvents} hint={`${report.upcomingCount || 0} sắp diễn ra • ${report.attentionCount || 0} cần xử lý`} />
        <StatCard icon="groups" label="Đăng ký & chỉ tiêu" value={report.totals.confirmedRegistrations || 0} hint={`${report.totals.pendingRegistrations || 0} chờ duyệt • ${report.totals.totalCapacity || 0} tổng chỉ tiêu`} accent="from-blue-500 to-cyan-400" tone="text-blue-600" />
        <StatCard icon="fact_check" label="Điểm danh thực tế" value={report.totals.attendedVolunteers || 0} hint={`${report.attendanceRate}% tham gia • ${compactNumber.format(report.totals.volunteerHours || 0)} giờ đóng góp`} accent="from-green-500 to-emerald-400" tone="text-green-600" />
        <StatCard icon="workspace_premium" label="Chứng chỉ & tài chính" value={report.totals.certificatesIssued || 0} hint={`${currency.format(report.totalFinancial)} đã xác nhận`} accent="from-orange-500 to-amber-400" tone="text-orange-600" />
      </section>

      <section>
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-soft border border-outline">
          <div className="flex items-center justify-between gap-4 mb-7">
            <div>
              <h3 className="text-xl font-black text-on-surface">Phễu chuyển đổi volunteer</h3>
              <p className="text-on-surface-variant">Theo dõi từ đăng ký, duyệt hồ sơ, tham gia thực tế đến cấp chứng chỉ.</p>
            </div>
            <Icon name="filter_alt" className="text-primary" size={30} />
          </div>
          <div className="grid md:grid-cols-2 gap-7">
            <div className="space-y-5">
              <FunnelStep icon="edit_note" label="Tổng đăng ký" value={report.funnel.registrations || 0} width={100} color="bg-blue-500" />
              <FunnelStep icon="verified_user" label="Đã xác nhận" value={report.funnel.confirmed || 0} width={funnelConfirmed} color="bg-primary" />
              <FunnelStep icon="fact_check" label="Đã tham gia" value={report.funnel.attended || 0} width={funnelAttended} color="bg-green-500" />
              <FunnelStep icon="workspace_premium" label="Chứng chỉ" value={report.funnel.certificates || 0} width={funnelCertificates} color="bg-amber-500" />
            </div>
            <div className="rounded-3xl bg-surface-variant p-6 flex flex-col justify-center gap-5">
              <ProgressBar label="Tỷ lệ xác nhận đăng ký" value={report.confirmationRate} color="bg-primary" />
              <ProgressBar label="Tỷ lệ điểm danh/tham gia" value={report.attendanceRate} color="bg-green-500" />
              <div className="mt-2 p-4 rounded-2xl bg-white border border-outline">
                <div className="flex gap-3">
                  <Icon name="tips_and_updates" className="text-amber-500 flex-shrink-0" size={24} />
                  <p className="text-sm text-on-surface-variant">
                    Ưu tiên xử lý đăng ký chờ duyệt và nhắc volunteer trước ngày diễn ra để tăng tỷ lệ tham gia thực tế.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 md:p-8 shadow-soft border border-outline">
          <div className="flex items-center justify-between gap-4 mb-7">
            <div>
              <h3 className="text-xl font-black text-on-surface">Hiệu suất tuyển volunteer theo sự kiện</h3>
              <p className="text-on-surface-variant">Xếp hạng theo số đã tham gia, kèm tỷ lệ điểm danh để nhận biết sự kiện cần nhắc lịch.</p>
            </div>
            <Link to="/quan-ly-su-kien" className="text-primary font-bold text-sm hover:underline">Xem tất cả</Link>
          </div>
          <BarChart items={report.topVolunteers} valueKey="attended" color="bg-primary" valueFormatter={(value) => `${value} đã điểm danh`} />
        </div>

        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-soft border border-outline">
          <div className="flex items-center justify-between gap-4 mb-7">
            <div>
              <h3 className="text-xl font-black text-on-surface">Theo danh mục</h3>
              <p className="text-on-surface-variant">Lĩnh vực hoạt động chính.</p>
            </div>
            <Icon name="category" className="text-primary" size={28} />
          </div>
          <div className="space-y-4">
            {report.categoryBreakdown.length ? report.categoryBreakdown.slice(0, 6).map((item, index) => {
              const max = Math.max(...report.categoryBreakdown.map(c => c.count), 1);
              return (
                <div key={item.category || index}>
                  <div className="flex justify-between mb-2 text-label-sm">
                    <span className="font-bold text-on-surface truncate">{item.category}</span>
                    <span className="text-on-surface-variant">{item.count}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-surface-variant overflow-hidden">
                    <div className="h-full bg-tertiary rounded-full" style={{ width: `${Math.max(6, item.count / max * 100)}%` }} />
                  </div>
                </div>
              );
            }) : (
              <p className="text-on-surface-variant text-center py-8">Chưa có dữ liệu danh mục</p>
            )}
          </div>
        </div>
      </section>

      <section className="grid xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-soft border border-outline">
          <div className="flex items-center justify-between gap-4 mb-7">
            <div>
              <h3 className="text-xl font-black text-on-surface">Giờ tình nguyện & chứng chỉ</h3>
              <p className="text-on-surface-variant">Các sự kiện tạo nhiều đóng góp thời gian nhất.</p>
            </div>
            <Icon name="timer" className="text-green-600" size={30} />
          </div>
          <BarChart items={report.topHours} valueKey="hours" color="bg-green-500" valueFormatter={(value) => `${value} giờ`} />
        </div>

        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-soft border border-outline">
          <div className="flex items-center justify-between gap-4 mb-7">
            <div>
              <h3 className="text-xl font-black text-on-surface">Nguồn lực theo sự kiện</h3>
              <p className="text-on-surface-variant">Ủng hộ và tài trợ đã xác nhận.</p>
            </div>
            <Icon name="stacked_line_chart" className="text-orange-600" size={30} />
          </div>
          <BarChart items={report.financialByEvent} valueKey="totalAmount" color="bg-orange-500" valueFormatter={(value) => currency.format(value)} />
        </div>
      </section>

      <section className="bg-white rounded-3xl p-6 md:p-8 shadow-soft border border-outline">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-black text-on-surface">Sự kiện gần đây</h3>
            <p className="text-on-surface-variant">Theo dõi nhanh lịch tổ chức và thao tác quản lý.</p>
          </div>
          <Link to="/quan-ly-su-kien" className="btn-primary flex items-center gap-2 w-fit">
            <Icon name="settings" size={20} />
            Quản lý sự kiện
          </Link>
        </div>

        {report.recentEvents.length > 0 ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {report.recentEvents.map(event => {
              return (
                <div key={event.id} className="group rounded-3xl border border-outline p-5 hover:shadow-soft transition-all bg-gradient-to-br from-white to-surface">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary-container flex items-center justify-center text-primary flex-shrink-0">
                      <Icon name="event" size={24} />
                    </div>
                  </div>
                  <h4 className="mt-4 font-black text-on-surface line-clamp-2 min-h-[3rem]">{event.title}</h4>
                  <div className="mt-4 space-y-2 text-sm text-on-surface-variant">
                    <div className="flex items-center gap-2">
                      <Icon name="calendar_month" size={18} />
                      {formatDate(event.startDate)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Icon name="location_on" size={18} />
                      <span className="truncate">{event.location || 'Chưa có địa điểm'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Icon name="groups" size={18} />
                      {(event.currentParticipants || 0)}/{event.maxParticipants || 0} volunteer
                    </div>
                  </div>
                  <Link to={`/su-kien/${event.id}`} className="mt-5 inline-flex items-center gap-2 text-primary font-bold group-hover:gap-3 transition-all">
                    Xem chi tiết
                    <Icon name="arrow_forward" size={18} />
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyIllustration />
        )}
      </section>
    </div>
  );
}
