import React, { useCallback, useEffect, useState } from 'react';
import { ratingApi } from '../../services/api';
import Loading from '../../components/common/Loading';
import { Alert, ConfirmDialog, EmptyState, PageHeader, Pagination, SearchInput, StarRating, StatusBadge, getErrorMessage, unwrap } from '../../components/common/CommonUI';

const PAGE_SIZE = 10;

export default function AdminRatings() {
  const [ratings, setRatings] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [reason, setReason] = useState('');
  const [edit, setEdit] = useState({ score: 5, comment: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await ratingApi.getAdminRatings({ page, pageSize: PAGE_SIZE, search: search || undefined, status: status || undefined });
      const data = res?.data?.data || res?.data || {};
      const items = Array.isArray(data) ? data : data.items || data.ratings || [];
      setRatings(items);
      setTotal(data.totalCount || data.total || items.length);
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được đánh giá'));
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => { load(); }, [load]);

  const action = async (type) => {
    if (!selected) return;
    try {
      if (type === 'hide') await ratingApi.hide(selected.id, reason || 'Ẩn bởi quản trị viên');
      if (type === 'unhide') await ratingApi.unhide(selected.id);
      if (type === 'delete') await ratingApi.delete(selected.id);
      if (type === 'update') await ratingApi.update(selected.id, edit);
      setDialog(null);
      setReason('');
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Thao tác thất bại'));
    }
  };

  const openEdit = (item) => {
    setSelected(item);
    setEdit({ score: item.score || item.rating || 5, comment: item.comment || '' });
    setDialog('update');
  };

  return (
    <div className="space-y-6">
      <PageHeader icon="reviews" title="Quản lý đánh giá" subtitle="Lọc, sửa, ẩn/hiện và xóa đánh giá hai chiều." />
      {error && <Alert type="error">{error}</Alert>}

      <div className="bg-white rounded-3xl shadow-soft border border-outline p-5">
        <div className="grid md:grid-cols-[1fr_220px] gap-3 mb-5">
          <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Tìm theo người dùng, sự kiện..." />
          <select className="input-field" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">Tất cả trạng thái</option>
            <option value="Visible">Đang hiển thị</option>
            <option value="Hidden">Đã ẩn</option>
          </select>
        </div>

        {loading ? <Loading /> : ratings.length === 0 ? <EmptyState icon="reviews" title="Chưa có đánh giá" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-surface-variant/50">
                <tr>
                  <th className="text-left p-4 text-label-sm uppercase tracking-wider text-on-surface-variant">Sự kiện</th>
                  <th className="text-left p-4 text-label-sm uppercase tracking-wider text-on-surface-variant">Người đánh giá</th>
                  <th className="text-left p-4 text-label-sm uppercase tracking-wider text-on-surface-variant">Điểm</th>
                  <th className="text-left p-4 text-label-sm uppercase tracking-wider text-on-surface-variant">Bình luận</th>
                  <th className="text-left p-4 text-label-sm uppercase tracking-wider text-on-surface-variant">Trạng thái</th>
                  <th className="text-right p-4 text-label-sm uppercase tracking-wider text-on-surface-variant">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {ratings.map((item) => (
                  <tr key={item.id} className="border-t border-outline hover:bg-primary-container/10">
                    <td className="p-4 font-bold text-on-surface">{item.eventTitle || item.event?.title || '—'}</td>
                    <td className="p-4 text-body-sm text-on-surface-variant">{item.raterName || item.rater?.name || '—'} → {item.rateeName || item.ratee?.name || '—'}</td>
                    <td className="p-4"><StarRating value={item.score || item.rating} readOnly /></td>
                    <td className="p-4 text-body-sm text-on-surface-variant max-w-xs">{item.comment || '—'}</td>
                    <td className="p-4"><StatusBadge status={item.isHidden ? 'Hidden' : 'Visible'}>{item.isHidden ? 'Đã ẩn' : 'Hiển thị'}</StatusBadge></td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button className="btn-secondary !py-2 !px-3" onClick={() => openEdit(item)}>Sửa</button>
                        {item.isHidden ? <button className="btn-primary !py-2 !px-3" onClick={() => { setSelected(item); setDialog('unhide'); }}>Hiện</button> : <button className="btn-secondary !py-2 !px-3" onClick={() => { setSelected(item); setDialog('hide'); }}>Ẩn</button>}
                        <button className="btn-danger !py-2 !px-3" onClick={() => { setSelected(item); setDialog('delete'); }}>Xóa</button>
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
        open={dialog === 'hide'}
        title="Ẩn đánh giá"
        message="Nhập lý do ẩn đánh giá."
        reason={reason}
        onReasonChange={setReason}
        confirmText="Ẩn"
        onConfirm={() => action('hide')}
        onClose={() => setDialog(null)}
      />
      <ConfirmDialog open={dialog === 'unhide'} title="Hiển thị lại đánh giá" confirmText="Hiển thị" onConfirm={() => action('unhide')} onClose={() => setDialog(null)} />
      <ConfirmDialog open={dialog === 'delete'} title="Xóa đánh giá" message="Thao tác này không thể hoàn tác." danger confirmText="Xóa" onConfirm={() => action('delete')} onClose={() => setDialog(null)} />

      {dialog === 'update' && (
        <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-soft border border-outline w-full max-w-lg p-6">
            <h3 className="text-title-lg font-bold text-on-surface">Sửa đánh giá</h3>
            <div className="mt-4"><StarRating value={edit.score} onChange={(score) => setEdit((p) => ({ ...p, score }))} /></div>
            <textarea className="input-field mt-4 min-h-28" value={edit.comment} onChange={(e) => setEdit((p) => ({ ...p, comment: e.target.value }))} />
            <div className="flex justify-end gap-3 mt-6">
              <button className="btn-secondary" onClick={() => setDialog(null)}>Hủy</button>
              <button className="btn-primary" onClick={() => action('update')}>Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
