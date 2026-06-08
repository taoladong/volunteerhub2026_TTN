import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import { fmt } from '../../utils/format';
import { eventApi } from '../../services/api';

export default function MyEvents() {
  const navigate = useNavigate();
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
    { key: 'all', label: 'Tất cả', count: counts.all },
    { key: 'Pending', label: 'Chờ duyệt', count: counts.Pending },
    { key: 'Approved', label: 'Đang mở', count: counts.Approved },
    { key: 'Completed', label: 'Hoàn thành', count: counts.Completed },
    { key: 'Rejected', label: 'Bị từ chối', count: counts.Rejected },
    { key: 'Cancelled', label: 'Đã hủy', count: counts.Cancelled },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--c-ink)', margin: 0 }}>Sự kiện của tôi</h1>
          <p style={{ fontSize: 13, color: 'rgba(15,15,15,0.50)', marginTop: 2 }}>
            {counts.all} sự kiện tổng cộng
          </p>
        </div>
        <Link to="/events/create" className="btn-primary flex items-center gap-2">
          <i className="fa-solid fa-circle-plus" /> Tạo sự kiện
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {filterCards.map((item) => {
          const isActive = filter === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              style={{
                padding: '5px 14px', borderRadius: 999, border: 'none',
                fontSize: 13, fontWeight: isActive ? 600 : 400,
                background: isActive ? 'var(--c-ink)' : 'rgba(15,15,15,0.05)',
                color: isActive ? '#fff' : 'rgba(15,15,15,0.60)',
                cursor: 'pointer', transition: 'all 0.12s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {item.label}
              <span style={{
                fontSize: 10, fontWeight: 700,
                background: isActive ? 'rgba(255,255,255,0.20)' : 'rgba(15,15,15,0.10)',
                color: isActive ? '#fff' : 'rgba(15,15,15,0.55)',
                borderRadius: 8, padding: '1px 6px',
              }}>
                {item.count}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <EmptyState
          icon="fa-calendar-xmark"
          title="Chưa có sự kiện nào"
          description={filter === 'all'
            ? 'Tạo sự kiện đầu tiên để bắt đầu quản lý tình nguyện viên.'
            : `Không có sự kiện nào ở trạng thái "${filterCards.find((f) => f.key === filter)?.label}".`}
          cta={filter === 'all' ? 'Tạo sự kiện' : undefined}
          ctaTo={filter === 'all' ? '/events/create' : undefined}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((event) => (
            <div
              key={event.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
                background: '#fff', borderRadius: 12,
                border: '1px solid var(--c-border)',
                transition: 'border-color 0.12s',
              }}
              className="flex-col sm:flex-row sm:items-center"
            >
              <div style={{
                width: 80, height: 80, borderRadius: 10, flexShrink: 0, overflow: 'hidden',
                background: 'rgba(27,97,201,0.06)', border: '1px solid var(--c-border)',
              }}>
                {event.imageUrl ? (
                  <img src={event.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <i className="fa-solid fa-calendar-days" style={{ color: 'rgba(27,97,201,0.35)', fontSize: 22 }} />
                  </div>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-ink)' }}>{event.title}</span>
                  <StatusBadge status={event.status} />
                  {event.status === 'Approved' && new Date(event.startDate) <= new Date() && new Date(event.endDate) > new Date() && (
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 999,
                      background: 'rgba(180,83,9,0.10)', color: '#b45309',
                    }}>Đang diễn ra</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'rgba(15,15,15,0.50)', flexWrap: 'wrap' }}>
                  <span><i className="fa-solid fa-calendar mr-1" />{fmt(event.startDate)}</span>
                  {event.location && <span><i className="fa-solid fa-location-dot mr-1" />{event.location}</span>}
                  <span><i className="fa-solid fa-users mr-1" />{event.currentParticipants}/{event.maxParticipants}</span>
                </div>
                {event.status === 'Approved' && new Date(event.endDate) <= new Date() && (
                  <p style={{ fontSize: 12, color: '#b45309', marginTop: 4, fontWeight: 500 }}>
                    <i className="fa-solid fa-triangle-exclamation mr-1" />Sự kiện đã kết thúc — hãy hoàn thành hoặc hủy.
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
                {(event.status === 'Approved' || event.status === 'Completed' || event.status === 'Cancelled') && (
                  <Link to={`/events/${event.id}/manage`} className="btn-secondary btn-sm flex items-center gap-1">
                    <i className="fa-solid fa-list-check" /> Quản lý
                  </Link>
                )}

                {event.status !== 'Completed' && event.status !== 'Cancelled' && (
                  event.status === 'Pending' ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Sự kiện đang chờ admin duyệt. Sửa sẽ cần gửi duyệt lại. Bạn muốn tiếp tục?')) {
                          navigate(`/events/${event.id}/edit`);
                        }
                      }}
                      className="btn-secondary btn-sm flex items-center gap-1"
                    >
                      <i className="fa-solid fa-pen" /> Sửa
                    </button>
                  ) : (
                    <Link to={`/events/${event.id}/edit`} className="btn-secondary btn-sm flex items-center gap-1">
                      <i className="fa-solid fa-pen" /> Sửa
                    </Link>
                  )
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
