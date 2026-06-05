import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Pagination from '../../components/ui/Pagination';
import { eventApi } from '../../services/api';

function fmt(dt) {
  return dt ? new Date(dt).toLocaleDateString('vi-VN') : '';
}

function RejectEventModal({ event, onClose, onSubmit, saving }) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    setReason('');
  }, [event]);

  if (!event) return null;

  return (
    <Modal isOpen={!!event} onClose={onClose} title="Từ chối sự kiện" size="md">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(reason);
        }}
      >
        <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
          <i className="fa-solid fa-circle-exclamation mr-1" />
          Sự kiện sẽ quay về trạng thái bị từ chối. Nhà tổ chức có thể sửa và gửi duyệt lại.
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lý do từ chối</label>
          <textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="input-field resize-none"
            placeholder="Ví dụ: thông tin chưa đầy đủ, thời gian không hợp lệ, chưa rõ tính pháp lý..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Đóng</button>
          <button type="submit" disabled={saving} className="btn-danger flex items-center gap-2">
            {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Xác nhận từ chối
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminEvents() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || 'Pending';
  const initialPage = Math.max(1, Number(searchParams.get('page')) || 1);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(initialStatus);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState({});
  const [rejectTarget, setRejectTarget] = useState(null);

  const buildReturnTo = (nextPage = page, status = filter) => {
    const params = new URLSearchParams();
    if (status && status !== 'Pending') params.set('status', status);
    if (nextPage > 1) params.set('page', String(nextPage));
    const query = params.toString();
    return `/admin/events${query ? `?${query}` : ''}`;
  };

  const syncUrl = (nextPage, status) => {
    const url = buildReturnTo(nextPage, status);
    const query = url.includes('?') ? url.split('?')[1] : '';
    setSearchParams(query, { replace: true });
  };

  const load = (nextPage = page, status = filter) => {
    setLoading(true);
    const params = { page: nextPage, pageSize: 15 };
    if (status !== 'all') params.status = status;

    eventApi.getAll(params)
      .then((r) => {
        setEvents(r.data?.items || []);
        setTotalPages(r.data?.totalPages || 1);
        setPage(nextPage);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(initialPage, initialStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeFilter = (status) => {
    setFilter(status);
    setPage(1);
    syncUrl(1, status);
    load(1, status);
  };

  const changePage = (nextPage) => {
    setPage(nextPage);
    syncUrl(nextPage, filter);
    load(nextPage, filter);
  };

  const setAction = (id, value) => setActionLoading((prev) => ({ ...prev, [id]: value }));

  const getErrorMessage = (err) => {
    const status = err.response?.status;
    const msg = err.response?.data?.message || err.response?.data?.title || err.message || 'Thất bại';
    return `[${status || 'Network'}] ${msg}`;
  };

  const approve = async (id) => {
    setAction(id, 'approve');
    try {
      await eventApi.approve(id);
      setEvents((prev) => prev.map((event) => (event.id === id ? { ...event, status: 'Approved' } : event)));
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setAction(id, null);
    }
  };

  const reject = async (reason) => {
    if (!rejectTarget) return;

    setAction(rejectTarget.id, 'reject');
    try {
      await eventApi.reject(rejectTarget.id, { reason });
      setEvents((prev) => prev.map((event) => (event.id === rejectTarget.id ? { ...event, status: 'Rejected' } : event)));
      setRejectTarget(null);
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setAction(rejectTarget.id, null);
    }
  };

  const complete = async (id) => {
    if (!confirm('Đánh dấu sự kiện này là hoàn thành?')) return;

    setAction(id, 'complete');
    try {
      await eventApi.complete(id);
      setEvents((prev) => prev.map((event) => (event.id === id ? { ...event, status: 'Completed' } : event)));
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setAction(id, null);
    }
  };

  const uncomplete = async (id) => {
    if (!confirm('Mở lại sẽ thu hồi chứng chỉ đã cấp của sự kiện. Tiếp tục?')) return;

    setAction(id, 'uncomplete');
    try {
      await eventApi.uncomplete(id);
      setEvents((prev) => prev.map((event) => (event.id === id ? { ...event, status: 'Approved' } : event)));
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setAction(id, null);
    }
  };

  const filters = [
    { key: 'Pending', label: 'Chờ duyệt' },
    { key: 'Approved', label: 'Đã duyệt' },
    { key: 'Completed', label: 'Hoàn thành' },
    { key: 'Rejected', label: 'Từ chối' },
    { key: 'Cancelled', label: 'Đã hủy' },
    { key: 'all', label: 'Tất cả' },
  ];
  const returnTo = buildReturnTo();

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Duyệt sự kiện</h1>

      <div className="flex gap-2 flex-wrap">
        {filters.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => changeFilter(item.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === item.key ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : events.length === 0 ? (
        <div className="card p-12 text-center">
          <i className="fa-solid fa-calendar-check text-4xl text-gray-300 mb-3 block" />
          <p className="text-gray-500">Không có sự kiện nào</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="text-left px-4 py-3">Sự kiện</th>
                <th className="text-left px-4 py-3">Ban tổ chức</th>
                <th className="text-left px-4 py-3">Thời gian</th>
                <th className="text-left px-4 py-3">Người tham gia</th>
                <th className="text-left px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events.map((event) => (
                <tr key={event.id} className="odd:bg-gray-50/50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 max-w-xs truncate">{event.title}</div>
                    {event.location && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        <i className="fa-solid fa-location-dot mr-1" />{event.location}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{event.organizer?.name || event.organizer?.userName || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <div>{fmt(event.startDate)}</div>
                    <div className="text-xs text-gray-400">→ {fmt(event.endDate)}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{event.currentParticipants}/{event.maxParticipants}</td>
                  <td className="px-4 py-3"><StatusBadge status={event.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 justify-end flex-wrap">
                      <Link to={`/events/${event.id}?returnTo=${encodeURIComponent(returnTo)}`} className="btn-secondary btn-sm text-xs flex items-center gap-1" title="Xem chi tiết sự kiện">
                        <i className="fa-solid fa-eye" /> Xem
                      </Link>

                      {event.status === 'Pending' && (
                        <>
                          <button type="button" onClick={() => approve(event.id)} disabled={!!actionLoading[event.id]} className="btn-primary btn-sm text-xs flex items-center gap-1">
                            {actionLoading[event.id] === 'approve'
                              ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              : <i className="fa-solid fa-check" />}
                            Duyệt
                          </button>
                          <button type="button" onClick={() => setRejectTarget(event)} disabled={!!actionLoading[event.id]} className="btn-danger btn-sm text-xs flex items-center gap-1">
                            {actionLoading[event.id] === 'reject'
                              ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              : <i className="fa-solid fa-xmark" />}
                            Từ chối
                          </button>
                        </>
                      )}

                      {event.status === 'Approved' && (
                        <button type="button" onClick={() => complete(event.id)} disabled={!!actionLoading[event.id]} className="btn-secondary btn-sm text-xs flex items-center gap-1">
                          {actionLoading[event.id] === 'complete'
                            ? <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                            : <i className="fa-solid fa-flag-checkered" />}
                          Hoàn thành
                        </button>
                      )}

                      {event.status === 'Completed' && (
                        <button type="button" onClick={() => uncomplete(event.id)} disabled={!!actionLoading[event.id]} className="btn-secondary btn-sm text-xs flex items-center gap-1">
                          {actionLoading[event.id] === 'uncomplete'
                            ? <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                            : <i className="fa-solid fa-rotate-left" />}
                          Mở lại
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={changePage} />
      )}

      <RejectEventModal
        event={rejectTarget}
        onClose={() => setRejectTarget(null)}
        onSubmit={reject}
        saving={actionLoading[rejectTarget?.id] === 'reject'}
      />
    </div>
  );
}
