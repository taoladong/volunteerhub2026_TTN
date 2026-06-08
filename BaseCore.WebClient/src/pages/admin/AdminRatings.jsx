import React, { useEffect, useState } from 'react';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import { ratingApi } from '../../services/api';

function fmt(dt) {
  return dt ? new Date(dt).toLocaleString('vi-VN') : '';
}

function HideRatingModal({ rating, onClose, onSubmit, saving }) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    setReason(rating?.hiddenReason || '');
  }, [rating]);

  if (!rating) return null;

  return (
    <Modal isOpen={!!rating} onClose={onClose} title="Ẩn đánh giá" size="md">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(reason);
        }}
      >
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <i className="fa-solid fa-eye-slash mr-1" />
          Đánh giá bị ẩn sẽ không còn hiển thị ở hồ sơ người được đánh giá.
        </div>

        <div>
          <label className="block text-sm font-medium text-warmink-2 mb-1">Lý do ẩn</label>
          <textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="input-field resize-none"
            placeholder="Ví dụ: ngôn ngữ không phù hợp, nội dung công kích cá nhân..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Đóng</button>
          <button type="submit" disabled={saving} className="btn-danger flex items-center gap-2">
            {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Ẩn đánh giá
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminRatings() {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState({});
  const [hideTarget, setHideTarget] = useState(null);

  const load = (nextPage = 1, nextFilter = filter) => {
    setLoading(true);
    const params = { page: nextPage, pageSize: 15 };
    if (nextFilter === 'visible') params.hidden = false;
    if (nextFilter === 'hidden') params.hidden = true;

    ratingApi.getAdminRatings(params)
      .then((response) => {
        setRatings(response.data?.items || []);
        setTotalPages(response.data?.totalPages || 1);
        setPage(nextPage);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(1, filter);
  }, [filter]);

  const setAction = (id, value) => setActionLoading((prev) => ({ ...prev, [id]: value }));

  const hideRating = async (reason) => {
    if (!hideTarget) return;

    setAction(hideTarget.id, 'hide');
    try {
      await ratingApi.hide(hideTarget.id, reason);
      setRatings((prev) => prev.map((rating) => (
        rating.id === hideTarget.id
          ? { ...rating, isHidden: true, hiddenReason: reason, hiddenAt: new Date().toISOString() }
          : rating
      )));
      setHideTarget(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Ẩn đánh giá thất bại');
    } finally {
      setAction(hideTarget.id, null);
    }
  };

  const unhideRating = async (rating) => {
    setAction(rating.id, 'unhide');
    try {
      await ratingApi.unhide(rating.id);
      setRatings((prev) => prev.map((item) => (
        item.id === rating.id
          ? { ...item, isHidden: false, hiddenReason: '', hiddenAt: null }
          : item
      )));
    } catch (err) {
      alert(err.response?.data?.message || 'Hiện lại đánh giá thất bại');
    } finally {
      setAction(rating.id, null);
    }
  };

  const deleteRating = async (rating) => {
    if (!confirm('Xóa vĩnh viễn đánh giá này?')) return;

    setAction(rating.id, 'delete');
    try {
      await ratingApi.delete(rating.id);
      setRatings((prev) => prev.filter((item) => item.id !== rating.id));
    } catch (err) {
      alert(err.response?.data?.message || 'Xóa đánh giá thất bại');
    } finally {
      setAction(rating.id, null);
    }
  };

  const filters = [
    { key: 'all', label: 'Tất cả' },
    { key: 'visible', label: 'Đang hiển thị' },
    { key: 'hidden', label: 'Đã ẩn' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-warmink">Kiểm duyệt đánh giá</h1>
        <p className="text-sm text-warmink-2 mt-1">Ẩn, hiện lại hoặc xóa các đánh giá không phù hợp trong hệ thống.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {filters.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === item.key ? 'bg-primary-600 text-white' : 'bg-white border border-warmborder text-warmink-2 hover:border-primary-300'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : ratings.length === 0 ? (
        <div className="card p-12 text-center">
          <i className="fa-solid fa-star text-4xl text-warmink-3 mb-3 block" />
          <p className="text-warmink-2">Không có đánh giá nào phù hợp bộ lọc</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ratings.map((rating) => (
            <div key={rating.id} className="card p-5 space-y-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-warmink">{rating.eventTitle || `Sự kiện #${rating.eventId}`}</p>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium border ${rating.isHidden ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
                      {rating.isHidden ? 'Đã ẩn' : 'Đang hiển thị'}
                    </span>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                      {rating.score}/5 sao
                    </span>
                  </div>
                  <p className="text-sm text-warmink-2">
                    <span className="font-medium">Người đánh giá:</span> {rating.raterName || `#${rating.raterId}`}
                    {' · '}
                    <span className="font-medium">Người được đánh giá:</span> {rating.rateeName || `#${rating.rateeId}`}
                  </p>
                  <p className="text-sm text-warmink whitespace-pre-wrap">{rating.comment || 'Không có nhận xét.'}</p>
                  <p className="text-xs text-warmink-3">Tạo lúc {fmt(rating.createdAt)}</p>
                  {rating.isHidden && (
                    <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                      <p><span className="font-medium">Lý do ẩn:</span> {rating.hiddenReason || 'Không có ghi chú'}</p>
                      {rating.hiddenAt && <p className="mt-1 text-xs">Ẩn lúc {fmt(rating.hiddenAt)}</p>}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {!rating.isHidden ? (
                    <button type="button" onClick={() => setHideTarget(rating)} disabled={!!actionLoading[rating.id]} className="btn-danger btn-sm flex items-center gap-1">
                      {actionLoading[rating.id] === 'hide'
                        ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <i className="fa-solid fa-eye-slash" />}
                      Ẩn
                    </button>
                  ) : (
                    <button type="button" onClick={() => unhideRating(rating)} disabled={!!actionLoading[rating.id]} className="btn-secondary btn-sm flex items-center gap-1">
                      {actionLoading[rating.id] === 'unhide'
                        ? <div className="w-3 h-3 border-2 border-warmborder-2 border-t-transparent rounded-full animate-spin" />
                        : <i className="fa-solid fa-eye" />}
                      Hiện lại
                    </button>
                  )}

                  <button type="button" onClick={() => deleteRating(rating)} disabled={!!actionLoading[rating.id]} className="btn-secondary btn-sm flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50">
                    {actionLoading[rating.id] === 'delete'
                      ? <div className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                      : <i className="fa-solid fa-trash" />}
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={(nextPage) => load(nextPage)} />
      )}

      <HideRatingModal
        rating={hideTarget}
        onClose={() => setHideTarget(null)}
        onSubmit={hideRating}
        saving={actionLoading[hideTarget?.id] === 'hide'}
      />
    </div>
  );
}
