import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { eventApi } from '../../services/api';
import Loading from '../../components/common/Loading';
import {
  ConfirmDialog,
  Alert,
  EmptyState,
  PageHeader,
  Pagination,
  SearchInput,
  StatusBadge,
  TabBar,
  formatDateTime,
  getErrorMessage,
  unwrap,
} from '../../components/common/CommonUI';

const PAGE_SIZE = 10;
const statusTabs = [
  { value: 'All', label: 'Tất cả' },
  { value: 'Pending', label: 'Chờ duyệt' },
  { value: 'Approved', label: 'Đã duyệt' },
  { value: 'Rejected', label: 'Từ chối' },
  { value: 'Completed', label: 'Hoàn thành' },
  { value: 'Cancelled', label: 'Đã hủy' },
];

const EVENT_STATUS_LABELS = {
  Pending: 'Chờ duyệt',
  Approved: 'Đã duyệt',
  Rejected: 'Từ chối',
  Completed: 'Hoàn thành',
  Cancelled: 'Đã hủy',
};

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [status, setStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, pageSize: PAGE_SIZE, search: search || undefined };
      if (status !== 'All') params.status = status;
      const res = await eventApi.getAll(params);
      const data = res?.data?.data || res?.data || {};
      const items = Array.isArray(data) ? data : data.items || data.events || [];
      setEvents(items);
      setTotal(data.totalCount || data.total || items.length);
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được danh sách sự kiện'));
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  const loadOverdue = useCallback(async () => {
    try {
      const res = await eventApi.getOverduePreview();
      setOverdue(unwrap(res));
    } catch {
      setOverdue([]);
    }
  }, []);

  useEffect(() => {
    loadEvents();
    loadOverdue();
  }, [loadEvents, loadOverdue]);

  const runAction = async (action) => {
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      if (action === 'approve') await eventApi.approve(selected.id);
      if (action === 'cancel') {
        if ((reason || '').trim().length < 10) throw new Error('Lý do hủy cần tối thiểu 10 ký tự');
        await eventApi.cancel(selected.id, reason);
      }
      setDialog(null);
      setReason('');
      await loadEvents();
      await loadOverdue();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon="event_available"
        title="Quản trị sự kiện"
        subtitle="Xem, duyệt và hủy sự kiện."
      />

      {error && <Alert type="error">{error}</Alert>}

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-soft border border-outline">
          <p className="text-on-surface-variant text-label-md">Tổng bản ghi</p>
          <p className="text-display-sm font-bold text-primary">{total}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-soft border border-outline">
          <p className="text-on-surface-variant text-label-md">Quá hạn cần xử lý</p>
          <p className="text-display-sm font-bold text-warning">{overdue.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-soft border border-outline">
          <p className="text-on-surface-variant text-label-md">Trang hiện tại</p>
          <p className="text-display-sm font-bold text-on-surface">{page}</p>
        </div>
      </div>

      {overdue.length > 0 && (
        <div className="bg-warning-container/60 rounded-3xl border border-warning/20 p-5">
          <h2 className="text-title-md font-bold text-on-surface mb-3">Sự kiện quá hạn</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {overdue.slice(0, 4).map((item) => (
              <div key={item.id} className="bg-white rounded-2xl p-4 border border-outline">
                <p className="font-bold text-on-surface">{item.title || item.name}</p>
                <p className="text-body-sm text-on-surface-variant">{formatDateTime(item.endDate)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-soft border border-outline p-5">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between mb-5">
          <TabBar tabs={statusTabs} active={status} onChange={(value) => { setStatus(value); setPage(1); }} />
          <div className="w-full lg:w-80">
            <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Tìm theo tên, địa điểm..." />
          </div>
        </div>

        {loading ? <Loading /> : events.length === 0 ? (
          <EmptyState icon="event_busy" title="Không có sự kiện" description="Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead className="bg-surface-variant/50">
                <tr>
                  <th className="text-left p-4 text-label-sm uppercase tracking-wider text-on-surface-variant">Sự kiện</th>
                  <th className="text-left p-4 text-label-sm uppercase tracking-wider text-on-surface-variant">Thời gian</th>
                  <th className="text-left p-4 text-label-sm uppercase tracking-wider text-on-surface-variant">Organizer</th>
                  <th className="text-left p-4 text-label-sm uppercase tracking-wider text-on-surface-variant">Trạng thái</th>
                  <th className="text-right p-4 text-label-sm uppercase tracking-wider text-on-surface-variant">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-t border-outline hover:bg-primary-container/10 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-on-surface">{event.title || event.name || '—'}</p>
                      <p className="text-body-sm text-on-surface-variant">{event.location || '—'}</p>
                    </td>
                    <td className="p-4 text-body-sm text-on-surface-variant">{formatDateTime(event.startDate)} → {formatDateTime(event.endDate)}</td>
                    <td className="p-4 text-body-sm text-on-surface-variant">{event.organizerName || event.organizer?.name || event.createdByName || '—'}</td>
                    <td className="p-4"><StatusBadge status={event.status}>{EVENT_STATUS_LABELS[event.status] || 'Chưa cập nhật'}</StatusBadge></td>
                    <td className="p-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link className="btn-secondary !py-2 !px-3" to={`/su-kien/${event.id}`}>Xem</Link>
                        {String(event.status).toLowerCase() === 'pending' && <button className="btn-primary !py-2 !px-3" onClick={() => { setSelected(event); setDialog('approve'); }} disabled={busy}>Duyệt</button>}
                        {!['cancelled', 'completed'].includes(String(event.status).toLowerCase()) && <button className="btn-danger !py-2 !px-3" onClick={() => { setSelected(event); setDialog('cancel'); }} disabled={busy}>Hủy</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={dialog === 'approve'}
        title="Xác nhận thao tác"
        message={`Bạn muốn duyệt sự kiện "${selected?.title || selected?.name || ''}"?`}
        confirmText="Xác nhận"
        onConfirm={() => runAction('approve')}
        onClose={() => setDialog(null)}
      />

      <ConfirmDialog
        open={dialog === 'cancel'}
        title="Hủy sự kiện"
        message="Vui lòng nhập lý do rõ ràng. Các chiến dịch/tài trợ liên quan có thể bị ảnh hưởng theo luồng nghiệp vụ."
        confirmText="Hủy sự kiện"
        danger
        reason={reason}
        onReasonChange={setReason}
        onConfirm={() => runAction('cancel')}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}

