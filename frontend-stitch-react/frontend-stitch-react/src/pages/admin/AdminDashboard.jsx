import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, dashboardApi } from '../../services/api';
import Icon from '../../components/common/Icon';
import Loading from '../../components/common/Loading';

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardApi.get().catch(() => ({ data: null })),
      adminApi.getMonitoringSummary().catch(() => ({ data: null })),
    ]).then(([dashRes, monRes]) => {
      setSummary({ ...dashRes.data, ...monRes.data });
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-headline-lg font-bold text-on-surface">Bảng điều khiển Quản trị</h2>
          <p className="text-on-surface-variant">Giám sát hệ thống, xác minh danh tính và quản lý tài chính.</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary flex items-center gap-2">
            <Icon name="download" size={20} />
            Xuất báo cáo
          </button>
          <button className="btn-primary flex items-center gap-2">
            <Icon name="refresh" size={20} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-soft border border-outline border-t-4 border-t-success">
          <div className="text-label-sm text-on-surface-variant mb-2">Trạng thái hệ thống</div>
          <div className="text-2xl font-extrabold text-success">Ổn định</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-soft border border-outline">
          <div className="text-label-sm text-on-surface-variant mb-2">Tổng người dùng</div>
          <div className="text-2xl font-extrabold text-on-surface">{summary?.totalUsers || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-soft border border-outline">
          <div className="text-label-sm text-on-surface-variant mb-2">Tổng sự kiện</div>
          <div className="text-2xl font-extrabold text-on-surface">{summary?.totalEvents || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-soft border border-outline">
          <div className="text-label-sm text-on-surface-variant mb-2">Chờ xét duyệt</div>
          <div className="text-2xl font-extrabold text-warning">{summary?.pendingVerifications || 0}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/quan-tri/xac-minh" className="bg-white rounded-2xl p-6 shadow-soft border border-outline hover:border-primary hover:shadow-card transition-all group">
          <Icon name="verified_user" className="text-primary mb-4" size={32} />
          <h3 className="font-bold text-on-surface mb-1 group-hover:text-primary transition-colors">Xác minh & Phê duyệt</h3>
          <p className="text-sm text-on-surface-variant">Duyệt KYC, kỹ năng và tổ chức</p>
        </Link>
        <Link to="/quan-tri/nguoi-dung" className="bg-white rounded-2xl p-6 shadow-soft border border-outline hover:border-primary hover:shadow-card transition-all group">
          <Icon name="group" className="text-primary mb-4" size={32} />
          <h3 className="font-bold text-on-surface mb-1 group-hover:text-primary transition-colors">Quản lý người dùng</h3>
          <p className="text-sm text-on-surface-variant">Xem, khóa/mở khóa tài khoản</p>
        </Link>
        <Link to="/quan-tri/tai-chinh" className="bg-white rounded-2xl p-6 shadow-soft border border-outline hover:border-primary hover:shadow-card transition-all group">
          <Icon name="monitoring" className="text-primary mb-4" size={32} />
          <h3 className="font-bold text-on-surface mb-1 group-hover:text-primary transition-colors">Giám sát tài chính</h3>
          <p className="text-sm text-on-surface-variant">Theo dõi quyên góp và tài trợ</p>
        </Link>
      </div>
    </div>
  );
}