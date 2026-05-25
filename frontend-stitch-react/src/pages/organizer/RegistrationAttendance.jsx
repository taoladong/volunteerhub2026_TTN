import React, { useState, useEffect } from 'react';
import { eventApi, registrationApi } from '../../services/api';
import Icon from '../../components/common/Icon';
import Loading from '../../components/common/Loading';

export default function RegistrationAttendance() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    eventApi.getMine()
      .then(res => {
        const list = (Array.isArray(res.data) ? res.data : res.data?.items || [])
          .filter((event) => String(event.status).toLowerCase() !== 'cancelled');
        setEvents(list);
        if (list.length > 0) setSelectedEvent(list[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedEvent) return;
    eventApi.getRegistrations(selectedEvent)
      .then(res => setRegistrations(Array.isArray(res.data) ? res.data : res.data?.items || []))
      .catch(() => setRegistrations([]));
  }, [selectedEvent]);

  const handleCheckin = async (regId) => {
    try {
      await registrationApi.checkin(selectedEvent, regId, {});
      setRegistrations(prev => prev.map(r => r.id === regId ? { ...r, status: 'CheckedIn' } : r));
    } catch (err) { alert(err.response?.data?.message || 'Lỗi điểm danh'); }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-headline-lg font-bold text-on-surface">Quản lý đăng ký & Điểm danh</h2>
        <p className="text-on-surface-variant">Xem danh sách đăng ký và điểm danh cho sự kiện của bạn.</p>
      </div>

      {/* Event Selector */}
      <div className="bg-white rounded-2xl p-5 shadow-soft border border-outline">
        <label className="block text-label-sm text-on-surface-variant mb-2 font-semibold">Chọn sự kiện</label>
        {events.length === 0 ? (
          <p className="text-on-surface-variant">Không có sự kiện đang hoạt động để quản lý đăng ký và điểm danh.</p>
        ) : (
          <select
            value={selectedEvent || ''}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="input-field"
          >
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.title}</option>
            ))}
          </select>
        )}
      </div>

      {/* Registrations Table */}
      {registrations.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-outline">
          <Icon name="how_to_reg" size={48} className="text-outline mx-auto mb-4" />
          <p className="text-on-surface-variant">Chưa có người đăng ký cho sự kiện này.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-soft border border-outline overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-variant/50">
                <tr>
                  <th className="px-6 py-4 text-label-sm text-on-surface-variant uppercase">Họ tên</th>
                  <th className="px-6 py-4 text-label-sm text-on-surface-variant uppercase">Email</th>
                  <th className="px-6 py-4 text-label-sm text-on-surface-variant uppercase">Trạng thái</th>
                  <th className="px-6 py-4 text-label-sm text-on-surface-variant uppercase">Giờ</th>
                  <th className="px-6 py-4 text-label-sm text-on-surface-variant uppercase text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline">
                {registrations.map(reg => (
                  <tr key={reg.id} className="hover:bg-primary-container/10 transition-colors">
                    <td className="px-6 py-4 font-medium text-on-surface">{reg.volunteerName || reg.fullName || '—'}</td>
                    <td className="px-6 py-4 text-on-surface-variant text-sm">{reg.volunteerEmail || reg.email || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-label-sm font-bold ${
                        reg.status === 'CheckedIn' ? 'bg-primary-container text-primary' :
                        reg.status === 'Confirmed' ? 'bg-success-container text-on-success-container' :
                        'bg-warning-container text-amber-700'
                      }`}>
                        {reg.status === 'CheckedIn' ? 'Đã điểm danh' : reg.status === 'Confirmed' ? 'Đã xác nhận' : 'Chờ duyệt'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant text-sm">{reg.hours || 0}h</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {reg.status === 'Confirmed' && (
                        <button onClick={() => handleCheckin(reg.id)} className="text-primary font-label text-label-md hover:underline">
                          Điểm danh
                        </button>
                      )}
                      {reg.status === 'Pending' && (
                        <button
                          onClick={async () => {
                            await registrationApi.confirm(selectedEvent, reg.id);
                            setRegistrations(prev => prev.map(r => r.id === reg.id ? { ...r, status: 'Confirmed' } : r));
                          }}
                          className="text-primary font-label text-label-md hover:underline"
                        >
                          Xác nhận
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
