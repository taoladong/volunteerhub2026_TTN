import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dashboardApi } from '../services/api';
import StatCard from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';

function fmt(dt) {
  return dt ? new Date(dt).toLocaleDateString('vi-VN') : '';
}

export default function Dashboard() {
  const { user, isVolunteer, isOrganizer, isSponsor, isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi
      .get()
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Xin chào, {user?.name}!</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {isVolunteer() && 'Tiếp tục hành trình tình nguyện của bạn.'}
            {isOrganizer() && 'Quản lý chương trình và kết nối cộng đồng.'}
            {isSponsor() && 'Theo dõi các hoạt động tài trợ của bạn.'}
            {isAdmin() && 'Giám sát toàn bộ hệ thống VolunteerHub.'}
          </p>
        </div>
        <Link to="/events" className="btn-primary btn-sm hidden sm:flex items-center gap-2">
          <i className="fa-solid fa-calendar-days" />
          Xem sự kiện
        </Link>
      </div>

      {isVolunteer() && data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon="fa-clock" label="Tổng giờ tình nguyện" value={`${data.totalHours || 0}h`} color="green" />
            <StatCard icon="fa-calendar-check" label="Sự kiện đã tham gia" value={data.attendedEvents || 0} color="blue" />
            <StatCard icon="fa-clipboard-list" label="Tổng đăng ký" value={data.totalRegistrations || 0} color="yellow" />
            <StatCard icon="fa-medal" label="Huy hiệu" value={data.recentBadges?.length || 0} color="purple" />
          </div>

          {data.upcomingEvents?.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Sự kiện sắp diễn ra</h2>
                <Link to="/events" className="text-sm text-primary-600 hover:underline">
                  Xem tất cả
                </Link>
              </div>
              <div className="space-y-2">
                {data.upcomingEvents.map((ev) => (
                  <Link key={ev.id} to={`/events/${ev.id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <i className="fa-solid fa-calendar text-primary-600 text-sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{ev.title}</p>
                      <p className="text-xs text-gray-400">
                        {fmt(ev.startDate)} · {ev.location}
                      </p>
                    </div>
                    <StatusBadge status={ev.status} />
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { to: '/my-registrations', icon: 'fa-clipboard-list', label: 'Đăng ký của tôi', color: 'bg-blue-50 text-blue-600' },
              { to: '/profile/passport', icon: 'fa-id-card', label: 'Hộ chiếu', color: 'bg-primary-50 text-primary-600' },
              { to: '/my-certificates', icon: 'fa-certificate', label: 'Chứng chỉ', color: 'bg-purple-50 text-purple-600' },
              { to: '/my-badges', icon: 'fa-medal', label: 'Huy hiệu', color: 'bg-yellow-50 text-yellow-600' },
            ].map((l) => (
              <Link key={l.to} to={l.to} className="card p-4 flex flex-col items-center gap-2 hover:shadow-md transition-shadow text-center">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${l.color}`}>
                  <i className={`fa-solid ${l.icon}`} />
                </div>
                <span className="text-xs font-medium text-gray-700">{l.label}</span>
              </Link>
            ))}
          </div>
        </>
      )}

      {isOrganizer() && data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon="fa-calendar-days" label="Tổng sự kiện" value={data.totalEvents || 0} color="green" />
            <StatCard icon="fa-calendar-check" label="Đang hoạt động" value={data.approvedEvents || 0} color="blue" />
            <StatCard icon="fa-clock" label="Chờ xác nhận" value={data.pendingRegistrations || 0} color="yellow" />
            <StatCard icon="fa-users" label="Tình nguyện viên" value={data.totalVolunteers || 0} color="purple" />
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link to="/events/create" className="btn-primary flex items-center gap-2">
              <i className="fa-solid fa-circle-plus" />
              Tạo sự kiện mới
            </Link>
            <Link to="/my-events" className="btn-secondary flex items-center gap-2">
              <i className="fa-solid fa-list-check" />
              Quản lý sự kiện
            </Link>
          </div>
          {data.recentEvents?.length > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Sự kiện gần đây</h2>
              <div className="space-y-2">
                {data.recentEvents.map((ev) => (
                  <div key={ev.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{ev.title}</p>
                      <p className="text-xs text-gray-400">{fmt(ev.startDate)}</p>
                    </div>
                    <StatusBadge status={ev.status} />
                    {(ev.status === 'Approved' || ev.status === 'Completed') && (
                      <Link to={`/events/${ev.id}/manage`} className="text-xs text-primary-600 hover:underline whitespace-nowrap">
                        Quản lý
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {isSponsor() && data && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <StatCard icon="fa-hand-holding-dollar" label="Tổng tài trợ" value={data.totalSponsored || 0} color="purple" />
            <StatCard icon="fa-calendar-days" label="Sự kiện hỗ trợ" value={data.sponsors?.length || 0} color="green" />
          </div>
          <div className="flex gap-3">
            <Link to="/events" className="btn-primary flex items-center gap-2">
              <i className="fa-solid fa-search" />
              Tìm sự kiện để tài trợ
            </Link>
            <Link to="/my-sponsorships" className="btn-secondary flex items-center gap-2">
              <i className="fa-solid fa-list" />
              Tài trợ của tôi
            </Link>
          </div>
        </>
      )}

      {isAdmin() && data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard icon="fa-users" label="Tổng người dùng" value={data.totalUsers || 0} color="blue" />
            <StatCard icon="fa-calendar-days" label="Tổng sự kiện" value={data.totalEvents || 0} color="green" />
            <StatCard icon="fa-clock" label="Chờ duyệt" value={data.pendingEvents || 0} color="yellow" />
            <StatCard icon="fa-clipboard-list" label="Đăng ký" value={data.totalRegistrations || 0} color="purple" />
            <StatCard icon="fa-certificate" label="Chứng chỉ" value={data.totalCertificates || 0} color="green" />
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/admin/events" className="btn-primary flex items-center gap-2">
              <i className="fa-solid fa-calendar-check" />
              Duyệt sự kiện
            </Link>
            <Link to="/admin/users" className="btn-secondary flex items-center gap-2">
              <i className="fa-solid fa-users" />
              Quản lý người dùng
            </Link>
            <Link to="/admin/export" className="btn-secondary flex items-center gap-2">
              <i className="fa-solid fa-file-export" />
              Xuất dữ liệu
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
