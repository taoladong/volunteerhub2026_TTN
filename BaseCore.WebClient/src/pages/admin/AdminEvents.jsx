import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Pagination from '../../components/ui/Pagination';
import { eventApi } from '../../services/api';

function fmtDate(dt) {
  return dt ? new Date(dt).toLocaleDateString('vi-VN') : '';
}

function fmtDateTime(dt) {
  return dt ? new Date(dt).toLocaleString('vi-VN') : '-';
}

function StatBox({ label, value }) {
  return (
    <div className="rounded-lg border border-warmborder bg-surface-2 p-3">
      <div className="text-xs text-warmink-2">{label}</div>
      <div className="mt-1 text-lg font-bold text-warmink">{value}</div>
    </div>
  );
}

function ReasonModal({ event, title, tone = 'red', placeholder, submitLabel, onClose, onSubmit, saving }) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    setReason('');
  }, [event]);

  if (!event) return null;

  const isDanger = tone === 'red';
  const minLength = 10;

  return (
    <Modal isOpen={!!event} onClose={onClose} title={title} size="md">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (reason.trim().length < minLength) {
            alert(`Vui lòng nhập lý do tối thiểu ${minLength} ký tự.`);
            return;
          }
          onSubmit(reason.trim());
        }}
      >
        <div className={`rounded-lg border p-3 text-sm ${isDanger ? 'border-red-100 bg-red-50 text-red-700' : 'border-amber-100 bg-amber-50 text-amber-700'}`}>
          <i className="fa-solid fa-circle-exclamation mr-1" />
          {event.title}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-warmink-2">Lý do</label>
          <textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="input-field resize-none"
            placeholder={placeholder}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Đóng</button>
          <button type="submit" disabled={saving} className={`${isDanger ? 'btn-danger' : 'btn-primary'} flex items-center gap-2`}>
            {saving && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function TransferEventModal({ event, onClose, onSubmit, saving }) {
  const [organizerId, setOrganizerId] = useState('');

  useEffect(() => {
    setOrganizerId('');
  }, [event]);

  if (!event) return null;

  return (
    <Modal isOpen={!!event} onClose={onClose} title="Chuyển nhà tổ chức" size="md">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const nextId = Number(organizerId);
          if (!Number.isInteger(nextId) || nextId <= 0) {
            alert('Vui lòng nhập ID nhà tổ chức hợp lệ.');
            return;
          }
          onSubmit(nextId);
        }}
      >
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700">
          Chỉ chuyển được cho tài khoản nhà tổ chức đang hoạt động và đã xác minh pháp lý.
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-warmink-2">ID nhà tổ chức mới</label>
          <input
            type="number"
            min="1"
            value={organizerId}
            onChange={(e) => setOrganizerId(e.target.value)}
            className="input-field"
            placeholder="Ví dụ: 12"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Đóng</button>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            Chuyển quyền quản lý
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EventDetailModal({ event, detail, loading, returnTo, onClose }) {
  if (!event) return null;

  const impact = detail?.impact;
  const full = detail?.event || event;

  return (
    <Modal isOpen={!!event} onClose={onClose} title="Chi tiết sự kiện" size="xl">
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-warmink">{full.title}</h2>
              <div className="mt-1 text-sm text-warmink-2">
                <i className="fa-solid fa-location-dot mr-1" />
                {full.location || 'Chưa có địa điểm'}
              </div>
            </div>
            <StatusBadge status={full.status} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatBox label="Đăng ký" value={impact ? impact.totalRegistrations : '-'} />
            <StatBox label="Đã xác nhận" value={impact ? impact.confirmedRegistrations : full.currentParticipants ?? '-'} />
            <StatBox label="Đã điểm danh" value={impact ? impact.attendedVolunteers : '-'} />
            <StatBox label="Chứng chỉ" value={impact ? impact.certificatesIssued : '-'} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-warmborder p-4">
              <h3 className="mb-3 font-semibold text-warmink">Thông tin tổ chức</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-warmink-2">Nhà tổ chức</dt>
                  <dd className="text-right font-medium text-warmink">{full.organizer?.name || full.organizer?.userName || impact?.organizer || '-'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-warmink-2">Danh mục</dt>
                  <dd className="text-right font-medium text-warmink">{full.category?.name || impact?.category || '-'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-warmink-2">KYC bắt buộc</dt>
                  <dd className="text-right font-medium text-warmink">{full.requiresKyc ? 'Có' : 'Không'}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-lg border border-warmborder p-4">
              <h3 className="mb-3 font-semibold text-warmink">Thời gian và quy mô</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-warmink-2">Bắt đầu</dt>
                  <dd className="text-right font-medium text-warmink">{fmtDateTime(full.startDate)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-warmink-2">Kết thúc</dt>
                  <dd className="text-right font-medium text-warmink">{fmtDateTime(full.endDate)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-warmink-2">Sức chứa</dt>
                  <dd className="text-right font-medium text-warmink">{full.currentParticipants ?? 0}/{full.maxParticipants ?? '-'}</dd>
                </div>
              </dl>
            </div>
          </div>

          {impact && (
            <div className="grid gap-3 sm:grid-cols-3">
              <StatBox label="Ủng hộ cá nhân đã xác nhận" value={`${impact.donationConfirmedCount || 0} lượt`} />
              <StatBox label="Tiền ủng hộ cá nhân" value={`${Number(impact.donationConfirmedAmount || 0).toLocaleString('vi-VN')}đ`} />
              <StatBox label="Tài trợ doanh nghiệp đã nhận" value={`${Number(impact.sponsorshipReceivedAmount || 0).toLocaleString('vi-VN')}đ`} />
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t border-warmborder pt-4">
            <Link to={`/events/${event.id}?returnTo=${encodeURIComponent(returnTo)}`} className="btn-secondary flex items-center gap-2">
              <i className="fa-solid fa-up-right-from-square" />
              Xem trang công khai
            </Link>
            <button type="button" onClick={onClose} className="btn-primary">Đóng</button>
          </div>
        </div>
      )}
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
  const [cancelTarget, setCancelTarget] = useState(null);
  const [transferTarget, setTransferTarget] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

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

  const autoCompleteOverdue = async () => {
    if (!confirm('Tự động hoàn thành mọi sự kiện đã quá hạn (đã duyệt nhưng qua thời gian kết thúc)? Hệ thống sẽ cấp chứng chỉ cho người đã điểm danh và đóng các đợt kêu gọi liên quan.')) return;
    setAction('__overdue__', 'overdue');
    try {
      const r = await eventApi.autoCompleteOverdue();
      alert(r.data?.message || `Đã xử lý ${r.data?.completed ?? r.data?.count ?? ''} sự kiện quá hạn.`);
      await load(page, filter);
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setAction('__overdue__', null);
    }
  };

  const approve = async (id) => {
    setAction(id, 'approve');
    try {
      await eventApi.approve(id);
      await load(page, filter);
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
      setRejectTarget(null);
      await load(page, filter);
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setAction(rejectTarget.id, null);
    }
  };

  const cancel = async (reason) => {
    if (!cancelTarget) return;

    setAction(cancelTarget.id, 'cancel');
    try {
      await eventApi.cancel(cancelTarget.id, reason);
      setCancelTarget(null);
      await load(page, filter);
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setAction(cancelTarget.id, null);
    }
  };

  const complete = async (id) => {
    if (!confirm('Đánh dấu sự kiện này là hoàn thành? Các đăng ký chưa xử lý sẽ không được tính tham gia.')) return;

    setAction(id, 'complete');
    try {
      await eventApi.complete(id);
      await load(page, filter);
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
      await load(page, filter);
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setAction(id, null);
    }
  };

  const transfer = async (newOrganizerId) => {
    if (!transferTarget) return;

    setAction(transferTarget.id, 'transfer');
    try {
      await eventApi.transfer(transferTarget.id, { newOrganizerId });
      setTransferTarget(null);
      load(page, filter);
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setAction(transferTarget.id, null);
    }
  };

  const deleteEvent = async (event) => {
    if (!confirm(`Xóa vĩnh viễn sự kiện "${event.title}"? Chỉ xóa được nếu sự kiện chưa phát sinh dữ liệu nghiệp vụ.`)) return;

    setAction(event.id, 'delete');
    try {
      await eventApi.delete(event.id);
      setEvents((prev) => prev.filter((item) => item.id !== event.id));
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setAction(event.id, null);
    }
  };

  const openDetail = async (event) => {
    setDetailTarget(event);
    setDetail(null);
    setDetailLoading(true);
    try {
      const [eventRes, impactRes] = await Promise.all([
        eventApi.getById(event.id),
        eventApi.getImpact(event.id),
      ]);
      setDetail({ event: eventRes.data, impact: impactRes.data });
    } catch (err) {
      alert(getErrorMessage(err));
      setDetail({ event, impact: null });
    } finally {
      setDetailLoading(false);
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-warmink">Quản lý sự kiện</h1>
          <p className="mt-1 text-sm text-warmink-2">Duyệt, hủy, chuyển nhà tổ chức và xóa có điều kiện các sự kiện chưa phát sinh dữ liệu.</p>
        </div>
        <button
          type="button"
          onClick={autoCompleteOverdue}
          disabled={actionLoading.__overdue__ === 'overdue'}
          className="btn-secondary btn-sm flex items-center gap-2"
          title="Hoàn thành tự động các sự kiện đã qua thời gian kết thúc"
        >
          {actionLoading.__overdue__ === 'overdue'
            ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-warmborder-2 border-t-transparent" />
            : <i className="fa-solid fa-flag-checkered" />}
          Hoàn thành sự kiện quá hạn
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => changeFilter(item.key)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === item.key ? 'bg-primary-600 text-white' : 'border border-warmborder bg-white text-warmink-2 hover:border-primary-300'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : events.length === 0 ? (
        <div className="card p-12 text-center">
          <i className="fa-solid fa-calendar-check mb-3 block text-4xl text-warmink-3" />
          <p className="text-warmink-2">Không có sự kiện nào</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left">Sự kiện</th>
                <th className="px-4 py-3 text-left">Ban tổ chức</th>
                <th className="px-4 py-3 text-left">Thời gian</th>
                <th className="px-4 py-3 text-left">Người tham gia</th>
                <th className="px-4 py-3 text-left">Trạng thái</th>
                <th className="px-4 py-3">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warmborder">
              {events.map((event) => (
                <tr key={event.id} className="odd:bg-surface-2/50 hover:bg-surface-2">
                  <td className="px-4 py-3">
                    <div className="max-w-xs truncate font-medium text-warmink">{event.title}</div>
                    {event.location && (
                      <div className="mt-0.5 text-xs text-warmink-3">
                        <i className="fa-solid fa-location-dot mr-1" />{event.location}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-warmink-2">{event.organizer?.name || event.organizer?.userName || '-'}</td>
                  <td className="px-4 py-3 text-warmink-2">
                    <div>{fmtDate(event.startDate)}</div>
                    <div className="text-xs text-warmink-3">→ {fmtDate(event.endDate)}</div>
                  </td>
                  <td className="px-4 py-3 text-warmink-2">{event.currentParticipants}/{event.maxParticipants}</td>
                  <td className="px-4 py-3"><StatusBadge status={event.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <button type="button" onClick={() => openDetail(event)} className="btn-secondary btn-sm flex items-center gap-1 text-xs" title="Xem chi tiết quản trị">
                        <i className="fa-solid fa-eye" /> Xem
                      </button>

                      <Link to={`/events/${event.id}?returnTo=${encodeURIComponent(returnTo)}`} className="btn-secondary btn-sm flex items-center gap-1 text-xs" title="Trang công khai">
                        <i className="fa-solid fa-up-right-from-square" />
                      </Link>

                      {event.status === 'Pending' && (
                        <>
                          <button type="button" onClick={() => approve(event.id)} disabled={!!actionLoading[event.id]} className="btn-primary btn-sm flex items-center gap-1 text-xs">
                            {actionLoading[event.id] === 'approve'
                              ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              : <i className="fa-solid fa-check" />}
                            Duyệt
                          </button>
                          <button type="button" onClick={() => setRejectTarget(event)} disabled={!!actionLoading[event.id]} className="btn-danger btn-sm flex items-center gap-1 text-xs">
                            {actionLoading[event.id] === 'reject'
                              ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              : <i className="fa-solid fa-xmark" />}
                            Từ chối
                          </button>
                        </>
                      )}

                      {event.status === 'Approved' && (
                        <>
                          <button type="button" onClick={() => complete(event.id)} disabled={!!actionLoading[event.id]} className="btn-secondary btn-sm flex items-center gap-1 text-xs">
                            {actionLoading[event.id] === 'complete'
                              ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-warmborder-2 border-t-transparent" />
                              : <i className="fa-solid fa-flag-checkered" />}
                            Hoàn thành
                          </button>
                          <button type="button" onClick={() => setCancelTarget(event)} disabled={!!actionLoading[event.id]} className="btn-danger btn-sm flex items-center gap-1 text-xs">
                            <i className="fa-solid fa-ban" /> Hủy
                          </button>
                        </>
                      )}

                      {(event.status === 'Pending' || event.status === 'Approved' || event.status === 'Rejected') && (
                        <button type="button" onClick={() => setTransferTarget(event)} disabled={!!actionLoading[event.id]} className="btn-secondary btn-sm flex items-center gap-1 text-xs">
                          {actionLoading[event.id] === 'transfer'
                            ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-warmborder-2 border-t-transparent" />
                            : <i className="fa-solid fa-right-left" />}
                          Chuyển
                        </button>
                      )}

                      {event.status === 'Completed' && (
                        <button type="button" onClick={() => uncomplete(event.id)} disabled={!!actionLoading[event.id]} className="btn-secondary btn-sm flex items-center gap-1 text-xs">
                          {actionLoading[event.id] === 'uncomplete'
                            ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-warmborder-2 border-t-transparent" />
                            : <i className="fa-solid fa-rotate-left" />}
                          Mở lại
                        </button>
                      )}

                      {(event.status === 'Pending' || event.status === 'Rejected' || event.status === 'Cancelled') && (
                        <button type="button" onClick={() => deleteEvent(event)} disabled={!!actionLoading[event.id]} className="btn-danger btn-sm flex items-center gap-1 text-xs">
                          {actionLoading[event.id] === 'delete'
                            ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            : <i className="fa-solid fa-trash" />}
                          Xóa
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
        <Pagination page={page} totalPages={totalPages} onPageChange={changePage} />
      )}

      <ReasonModal
        event={rejectTarget}
        title="Từ chối sự kiện"
        placeholder="Ví dụ: thông tin chưa đầy đủ, thời gian không hợp lệ, chưa rõ tính pháp lý..."
        submitLabel="Xác nhận từ chối"
        onClose={() => setRejectTarget(null)}
        onSubmit={reject}
        saving={actionLoading[rejectTarget?.id] === 'reject'}
      />

      <ReasonModal
        event={cancelTarget}
        title="Hủy sự kiện"
        placeholder="Ví dụ: sự kiện không thể tổ chức theo kế hoạch, nhà tổ chức không còn đủ điều kiện vận hành..."
        submitLabel="Xác nhận hủy"
        onClose={() => setCancelTarget(null)}
        onSubmit={cancel}
        saving={actionLoading[cancelTarget?.id] === 'cancel'}
      />

      <TransferEventModal
        event={transferTarget}
        onClose={() => setTransferTarget(null)}
        onSubmit={transfer}
        saving={actionLoading[transferTarget?.id] === 'transfer'}
      />

      <EventDetailModal
        event={detailTarget}
        detail={detail}
        loading={detailLoading}
        returnTo={returnTo}
        onClose={() => {
          setDetailTarget(null);
          setDetail(null);
        }}
      />
    </div>
  );
}
