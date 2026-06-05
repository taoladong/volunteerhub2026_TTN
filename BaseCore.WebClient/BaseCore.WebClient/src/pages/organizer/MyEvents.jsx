import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { eventApi } from '../../services/api';

function fmt(dt) {
  return dt ? new Date(dt).toLocaleDateString('vi-VN') : '';
}

export default function MyEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [resubmittingId, setResubmittingId] = useState(null);

  useEffect(() => {
    eventApi.getMine()
      .then((r) => setEvents(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Xóa sự kiện này?')) return;

    try {
      await eventApi.delete(id);
      setEvents((prev) => prev.filter((event) => event.id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Xóa thất bại');
    }
  };

  const handleResubmit = async (id) => {
    setResubmittingId(id);
    try {
      const response = await eventApi.resubmit(id);
      setEvents((prev) => prev.map((event) => (
        event.id === id ? { ...event, ...response.data, status: 'Pending' } : event
      )));
    } catch (err) {
      alert(err.response?.data?.message || 'Gửi duyệt lại thất bại');
    } finally {
      setResubmittingId(null);
    }
  };

  const filtered = filter === 'all' ? events : events.filter((event) => event.status === filter);
  const counts = {
    all: events.length,
    Pending: events.filter((event) => event.status === 'Pending').length,
    Approved: events.filter((event) => event.status === 'Approved').length,
    Completed: events.filter((event) => event.status === 'Completed').length,
    Rejected: events.filter((event) => event.status === 'Rejected').length,
    Cancelled: events.filter((event) => event.status === 'Cancelled').length,
  };

  const filterCards = [
    { key: 'all', label: 'Tất cả', count: counts.all, color: 'bg-gray-50 border-gray-200' },
    { key: 'Pending', label: 'Chờ duyệt', count: counts.Pending, color: 'bg-yellow-50 border-yellow-200' },
    { key: 'Approved', label: 'Đang mở', count: counts.Approved, color: 'bg-green-50 border-green-200' },
    { key: 'Completed', label: 'Hoàn thành', count: counts.Completed, color: 'bg-blue-50 border-blue-200' },
    { key: 'Rejected', label: 'Bị từ chối', count: counts.Rejected, color: 'bg-red-50 border-red-200' },
    { key: 'Cancelled', label: 'Đã hủy', count: counts.Cancelled, color: 'bg-orange-50 border-orange-200' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">Sự kiện của tôi</h1>
        <Link to="/events/create" className="btn-primary flex items-center gap-2">
          <i className="fa-solid fa-circle-plus" /> Tạo sự kiện
        </Link>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
        {filterCards.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={`rounded-xl border-2 p-3 text-center transition-all ${
              filter === item.key ? 'border-primary-500 bg-primary-50' : item.color
            }`}
          >
            <p className="text-lg font-bold text-gray-900">{item.count}</p>
            <p className="text-xs text-gray-500">{item.label}</p>
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <i className="fa-solid fa-calendar-xmark text-4xl text-gray-300 mb-3 block" />
          <p className="text-gray-500">Chưa có sự kiện nào</p>
          <Link to="/events/create" className="btn-primary btn-sm mt-4 inline-flex items-center gap-2">
            <i className="fa-solid fa-plus" /> Tạo ngay
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((event) => (
            <div key={event.id} className="card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-primary-100 flex-shrink-0 overflow-hidden">
                {event.imageUrl ? (
                  <img src={event.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <i className="fa-solid fa-calendar text-primary-300 text-xl" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{event.title}</h3>
                  <StatusBadge status={event.status} />
                  {event.status === 'Approved' && new Date(event.startDate) <= new Date() && new Date(event.endDate) > new Date() && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Đang diễn ra</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                  <span><i className="fa-solid fa-calendar mr-1" />{fmt(event.startDate)}</span>
                  {event.location && <span><i className="fa-solid fa-location-dot mr-1" />{event.location}</span>}
                  <span><i className="fa-solid fa-users mr-1" />{event.currentParticipants}/{event.maxParticipants}</span>
                </div>
                {event.status === 'Approved' && new Date(event.endDate) <= new Date() && (
                  <p className="text-xs text-red-600 mt-1 font-medium"><i className="fa-solid fa-triangle-exclamation mr-1" />Sự kiện đã kết thúc. Hãy hoàn thành hoặc hủy.</p>
                )}
                {event.status === 'Approved' && new Date(event.startDate) <= new Date() && new Date(event.endDate) > new Date() && (event.currentParticipants || 0) < (event.minParticipants || 1) && (
                  <p className="text-xs text-amber-600 mt-1 font-medium"><i className="fa-solid fa-circle-exclamation mr-1" />Đang diễn ra với ít người hơn dự kiến ({event.currentParticipants}/{event.minParticipants} tối thiểu).</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                {(event.status === 'Approved' || event.status === 'Completed' || event.status === 'Cancelled') && (
                  <Link to={`/events/${event.id}/manage`} className="btn-secondary btn-sm flex items-center gap-1">
                    <i className="fa-solid fa-list-check" /> Quản lý
                  </Link>
                )}

                {event.status !== 'Completed' && event.status !== 'Cancelled' && (
                  <Link to={`/events/${event.id}/edit`} className="btn-secondary btn-sm flex items-center gap-1">
                    <i className="fa-solid fa-pen" /> Sửa
                  </Link>
                )}

                {event.status === 'Rejected' && (
                  <button
                    type="button"
                    onClick={() => handleResubmit(event.id)}
                    disabled={resubmittingId === event.id}
                    className="btn-primary btn-sm flex items-center gap-1"
                  >
                    {resubmittingId === event.id ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <i className="fa-solid fa-paper-plane" />
                    )}
                    Gửi duyệt lại
                  </button>
                )}

                {event.status === 'Pending' && (
                  <button type="button" onClick={() => handleDelete(event.id)} className="btn-danger btn-sm flex items-center gap-1">
                    <i className="fa-solid fa-trash" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
