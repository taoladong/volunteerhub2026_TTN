import React, { useEffect, useMemo, useState } from 'react';
import { adminApi } from '../../services/api';
import Modal from '../../components/ui/Modal';
import ImageLightbox from '../../components/ui/ImageLightbox';

const STATUS = {
  PendingVerification: { label: 'Chờ duyệt', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  ChangesRequested: { label: 'Cần bổ sung', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  Rejected: { label: 'Đã từ chối', className: 'bg-red-50 text-red-700 border-red-200' },
  Verified: { label: 'Đã xác minh', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

const FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'PendingVerification', label: 'Chờ duyệt' },
  { value: 'ChangesRequested', label: 'Cần bổ sung' },
  { value: 'Verified', label: 'Đã xác minh' },
  { value: 'Rejected', label: 'Đã từ chối' },
];

const REVIEW_COPY = {
  approve: {
    title: 'Duyệt tổ chức',
    label: 'Ghi chú duyệt hồ sơ',
    placeholder: 'VD: Hồ sơ hợp lệ, tổ chức đủ điều kiện tạo sự kiện.',
    defaultNote: 'Hồ sơ hợp lệ.',
    button: 'Duyệt tổ chức',
    icon: 'fa-check',
  },
  requestChanges: {
    title: 'Yêu cầu bổ sung',
    label: 'Nội dung cần organizer bổ sung',
    placeholder: 'VD: Vui lòng bổ sung link tài liệu minh chứng hoặc thông tin người đại diện.',
    defaultNote: '',
    button: 'Gửi yêu cầu',
    icon: 'fa-pen-to-square',
  },
  reject: {
    title: 'Từ chối hồ sơ',
    label: 'Lý do từ chối',
    placeholder: 'VD: Thông tin tổ chức chưa đủ căn cứ xác minh.',
    defaultNote: '',
    button: 'Từ chối',
    icon: 'fa-xmark',
  },
};

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function AdminOrganizerVerifications() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState('');
  const [reviewState, setReviewState] = useState(null);
  const [reviewNote, setReviewNote] = useState('');

  const pendingCount = useMemo(
    () => items.filter((item) => item.status === 'PendingVerification').length,
    [items]
  );

  const loadData = () => {
    setLoading(true);
    setError('');
    return adminApi.getOrganizerVerifications(status ? { status } : {})
      .then((response) => setItems(response.data || []))
      .catch(() => setError('Không tải được danh sách hồ sơ xác minh.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [status]);

  const openReview = (item, action) => {
    const copy = REVIEW_COPY[action];
    setError('');
    setReviewState({ item, action });
    setReviewNote(copy.defaultNote);
  };

  const closeReview = () => {
    if (!actionId) {
      setReviewState(null);
      setReviewNote('');
    }
  };

  const submitReview = async () => {
    if (!reviewState) return;
    const note = reviewNote.trim();
    const { item, action } = reviewState;

    if (action !== 'approve' && !note) {
      setError('Vui lòng nhập lý do để organizer biết cần xử lý gì.');
      return;
    }

    setError('');
    setActionId(item.id);

    try {
      if (action === 'approve') {
        await adminApi.approveOrganizerVerification(item.id, { note });
      } else if (action === 'reject') {
        await adminApi.rejectOrganizerVerification(item.id, { note });
      } else {
        await adminApi.requestOrganizerVerificationChanges(item.id, { note });
      }
      setReviewState(null);
      setReviewNote('');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Thao tác duyệt hồ sơ thất bại.');
    } finally {
      setActionId(null);
    }
  };

  const reviewCopy = reviewState ? REVIEW_COPY[reviewState.action] : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Duyệt tổ chức</h1>
          <p className="text-sm text-gray-500 mt-1">
            Kiểm tra hồ sơ pháp lý của organizer trước khi họ được tạo sự kiện.
          </p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          <span className="font-semibold">{pendingCount}</span> hồ sơ đang chờ
        </div>
      </div>

      <div className="card p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <i className="fa-solid fa-filter text-gray-400" />
          Lọc trạng thái
        </div>
        <select className="input-field sm:w-56" value={status} onChange={(e) => setStatus(e.target.value)}>
          {FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>{filter.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <i className="fa-solid fa-circle-exclamation mr-2" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center text-sm text-gray-500">
          Không có hồ sơ xác minh phù hợp bộ lọc hiện tại.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const statusInfo = STATUS[item.status] || STATUS.PendingVerification;
            const canReview = item.status !== 'Verified';

            return (
              <article key={item.id} className="card p-5 space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-gray-900">{item.organizationName || 'Chưa có tên tổ chức'}</h2>
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Organizer: {item.organizerName || item.organizerUserName || `#${item.organizerId}`}
                      {' · '}
                      <a href={`/profile/${item.organizerId}`} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                        Xem hồ sơ
                      </a>
                    </p>
                  </div>
                  <div className="text-xs text-gray-400 sm:text-right">
                    <p>Gửi: {formatDate(item.submittedAt)}</p>
                    {item.verifiedAt && <p>Duyệt: {formatDate(item.verifiedAt)}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <p><span className="font-medium text-gray-700">Người đại diện:</span> {item.representativeName || '-'}</p>
                    <p><span className="font-medium text-gray-700">Email:</span> {item.contactEmail || '-'}</p>
                    <p><span className="font-medium text-gray-700">Điện thoại:</span> {item.phone || '-'}</p>
                    <p><span className="font-medium text-gray-700">Địa chỉ:</span> {item.address || '-'}</p>
                  </div>
                  <div className="space-y-2">
                    <p><span className="font-medium text-gray-700">Website:</span> {item.websiteUrl ? <a className="text-primary-600 underline" href={item.websiteUrl} target="_blank" rel="noreferrer">{item.websiteUrl}</a> : '-'}</p>
                    <p><span className="font-medium text-gray-700">Tài liệu:</span>{' '}
                      {item.documentUrl ? (
                        /\.(jpg|jpeg|png|gif|webp)$/i.test(item.documentUrl)
                          ? <ImageLightbox src={item.documentUrl} alt="Giấy tờ pháp lý" label="Xem ảnh giấy tờ" className="w-24 h-16 inline-block ml-2" />
                          : <a className="text-primary-600 underline" href={item.documentUrl} target="_blank" rel="noreferrer">{item.documentUrl}</a>
                      ) : '-'}
                    </p>
                    <p><span className="font-medium text-gray-700">Admin:</span> {item.verifierName || '-'}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700">
                  <p className="font-medium text-gray-900">Mô tả tổ chức</p>
                  <p className="mt-1 whitespace-pre-line">{item.description || '-'}</p>
                  {item.verificationNote && (
                    <>
                      <p className="font-medium text-gray-900 mt-3">Ghi chú từ organizer</p>
                      <p className="mt-1 whitespace-pre-line">{item.verificationNote}</p>
                    </>
                  )}
                  {item.adminNote && (
                    <>
                      <p className="font-medium text-gray-900 mt-3">Phản hồi admin gần nhất</p>
                      <p className="mt-1 whitespace-pre-line">{item.adminNote}</p>
                    </>
                  )}
                </div>

                {canReview && (
                  <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                    <button
                      type="button"
                      className="btn-secondary flex items-center justify-center gap-2"
                      disabled={actionId === item.id}
                      onClick={() => openReview(item, 'requestChanges')}
                    >
                      <i className="fa-solid fa-pen-to-square" />
                      Yêu cầu bổ sung
                    </button>
                    <button
                      type="button"
                      className="btn-secondary flex items-center justify-center gap-2"
                      disabled={actionId === item.id}
                      onClick={() => openReview(item, 'reject')}
                    >
                      <i className="fa-solid fa-xmark" />
                      Từ chối
                    </button>
                    <button
                      type="button"
                      className="btn-primary flex items-center justify-center gap-2"
                      disabled={actionId === item.id}
                      onClick={() => openReview(item, 'approve')}
                    >
                      <i className="fa-solid fa-check" />
                      Duyệt tổ chức
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <Modal
        open={Boolean(reviewState)}
        title={reviewCopy?.title || ''}
        onClose={closeReview}
        footer={(
          <>
            <button type="button" className="btn-secondary" onClick={closeReview} disabled={Boolean(actionId)}>
              Hủy
            </button>
            <button type="button" className="btn-primary flex items-center gap-2" onClick={submitReview} disabled={Boolean(actionId)}>
              {actionId && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <i className={`fa-solid ${reviewCopy?.icon || 'fa-check'}`} />
              {reviewCopy?.button || 'Xác nhận'}
            </button>
          </>
        )}
      >
        {reviewState && (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700">
              <p className="font-semibold text-gray-900">{reviewState.item.organizationName}</p>
              <p className="mt-1">Organizer: {reviewState.item.organizerName || reviewState.item.organizerUserName || `#${reviewState.item.organizerId}`}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{reviewCopy.label}</label>
              <textarea
                rows={4}
                className="input-field resize-none"
                value={reviewNote}
                onChange={(event) => setReviewNote(event.target.value)}
                placeholder={reviewCopy.placeholder}
                autoFocus
              />
              {reviewState.action !== 'approve' && (
                <p className="text-xs text-gray-400 mt-1">Thông tin này sẽ hiển thị lại cho organizer để họ biết cần làm gì tiếp theo.</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
