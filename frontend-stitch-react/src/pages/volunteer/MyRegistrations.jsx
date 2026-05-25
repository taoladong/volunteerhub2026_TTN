import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { registrationApi } from '../../services/api';
import Icon from '../../components/common/Icon';
import Loading from '../../components/common/Loading';

const STATUS_MAP = {
  Pending: { label: 'Chờ duyệt', bg: 'bg-warning-container', text: 'text-amber-700' },
  Confirmed: { label: 'Đã xác nhận', bg: 'bg-success-container', text: 'text-on-success-container' },
  CheckedIn: { label: 'Đã điểm danh', bg: 'bg-primary-container', text: 'text-primary' },
  Completed: { label: 'Hoàn thành', bg: 'bg-success-container', text: 'text-on-success-container' },
  Cancelled: { label: 'Đã hủy', bg: 'bg-error-container', text: 'text-error' },
};

export default function MyRegistrations() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await registrationApi.getMyRegistrations();
        setRegistrations(Array.isArray(res.data) ? res.data : res.data?.items || []);
      } catch { setRegistrations([]); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const upcoming = registrations.filter(r => ['Pending', 'Confirmed'].includes(r.status));
  const completed = registrations.filter(r => r.status === 'Completed');
  const cancelled = registrations.filter(r => r.status === 'Cancelled');

  const tabs = [
    { key: 'upcoming', label: `Sắp tới (${upcoming.length})` },
    { key: 'completed', label: `Đã hoàn thành (${completed.length})` },
    { key: 'cancelled', label: `Đã hủy (${cancelled.length})` },
  ];

  const currentList = activeTab === 'upcoming' ? upcoming : activeTab === 'completed' ? completed : cancelled;

  const handleWithdraw = async (eventId) => {
    if (!confirm('Bạn có chắc muốn rút đăng ký?')) return;
    try {
      await registrationApi.withdraw(eventId);
      setRegistrations(prev => prev.filter(r => r.eventId !== eventId));
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể rút đăng ký');
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-headline-lg font-bold text-on-surface mb-2">Đăng ký của tôi</h2>
        <p className="text-body-lg text-on-surface-variant">Quản lý các hoạt động sắp tới và xem lại lịch sử tham gia.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-8 border-b border-outline overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-4 px-1 font-label text-label-md whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? 'text-primary border-b-2 border-primary'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {currentList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-dashed border-outline">
          <div className="w-24 h-24 mb-6 flex items-center justify-center bg-primary-container rounded-full text-primary">
            <Icon name={activeTab === 'upcoming' ? 'event_available' : 'hourglass_empty'} size={48} />
          </div>
          <h3 className="text-xl font-bold text-on-surface mb-2">
            {activeTab === 'upcoming' ? 'Chưa có đăng ký nào' : 'Danh sách trống'}
          </h3>
          <p className="text-on-surface-variant max-w-sm mb-8">
            {activeTab === 'upcoming' ? 'Hãy khám phá các sự kiện và đăng ký tham gia!' : 'Không có mục nào trong danh sách này.'}
          </p>
          {activeTab === 'upcoming' && (
            <Link to="/su-kien" className="btn-primary">Khám phá sự kiện</Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentList.map((reg) => (
            <div key={reg.id} className="bg-white rounded-2xl shadow-soft border border-outline overflow-hidden flex flex-col group hover:shadow-card hover:border-primary/20 transition-all">
              <div className="h-40 overflow-hidden relative bg-primary-container">
                {reg.eventBannerUrl && (
                  <img src={reg.eventBannerUrl} alt={reg.eventTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                )}
                <div className="absolute top-4 right-4">
                  <span className={`${STATUS_MAP[reg.status]?.bg || 'bg-gray-100'} ${STATUS_MAP[reg.status]?.text || 'text-gray-700'} px-3 py-1 rounded-full text-label-sm font-bold`}>
                    {STATUS_MAP[reg.status]?.label || reg.status}
                  </span>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center gap-2 text-on-surface-variant mb-2">
                  <Icon name="calendar_today" size={16} />
                  <span className="text-label-sm">
                    {reg.eventStartDate ? new Date(reg.eventStartDate).toLocaleDateString('vi-VN') : 'Chưa xác định'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-on-surface mb-2 group-hover:text-primary transition-colors">
                  {reg.eventTitle || 'Sự kiện'}
                </h3>
                <p className="text-sm text-on-surface-variant line-clamp-2 mb-4">{reg.eventDescription}</p>

                <div className="mt-auto space-y-2">
                  <Link
                    to={`/su-kien/${reg.eventId}`}
                    className="btn-secondary w-full text-center flex items-center justify-center gap-2"
                  >
                    <Icon name="info" size={18} />
                    Xem chi tiết
                  </Link>
                  {activeTab === 'upcoming' && (
                    <button
                      onClick={() => handleWithdraw(reg.eventId)}
                      className="w-full py-3 text-on-surface-variant hover:text-error hover:bg-error-container rounded-2xl text-label-md transition-all"
                    >
                      Rút đăng ký
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}