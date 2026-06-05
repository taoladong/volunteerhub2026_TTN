import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { organizerVerificationApi } from '../../services/api';

const EMPTY_FORM = {
  organizationName: '',
  representativeName: '',
  contactEmail: '',
  phone: '',
  address: '',
  websiteUrl: '',
  description: '',
  documentUrl: '',
  verificationNote: '',
  commitmentAccepted: false,
};

const STATUS = {
  Unverified: { label: 'Chưa gửi hồ sơ', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  PendingVerification: { label: 'Đang chờ admin duyệt', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  ChangesRequested: { label: 'Cần bổ sung thông tin', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  Rejected: { label: 'Bị từ chối', className: 'bg-red-50 text-red-700 border-red-200' },
  Verified: { label: 'Đã xác minh', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

const asForm = (data = {}) => ({
  organizationName: data.organizationName || '',
  representativeName: data.representativeName || '',
  contactEmail: data.contactEmail || '',
  phone: data.phone || '',
  address: data.address || '',
  websiteUrl: data.websiteUrl || '',
  description: data.description || '',
  documentUrl: data.documentUrl || '',
  verificationNote: data.verificationNote || '',
  commitmentAccepted: Boolean(data.commitmentAccepted),
});

export default function OrganizerVerification() {
  const [verification, setVerification] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const statusInfo = useMemo(() => STATUS[verification?.status] || STATUS.Unverified, [verification?.status]);
  const isVerified = verification?.status === 'Verified';

  useEffect(() => {
    organizerVerificationApi.getMine()
      .then((response) => {
        setVerification(response.data);
        setForm(asForm(response.data));
      })
      .catch(() => setError('Không tải được hồ sơ xác minh. Vui lòng thử lại.'))
      .finally(() => setLoading(false));
  }, []);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (isVerified) {
      const ok = window.confirm(
        'Hồ sơ tổ chức đã được xác minh. Nếu gửi chỉnh sửa, hồ sơ sẽ chuyển về trạng thái chờ admin duyệt lại và bạn sẽ tạm thời không thể tạo sự kiện mới. Bạn muốn tiếp tục?'
      );
      if (!ok) return;
    }

    setSaving(true);

    try {
      const response = await organizerVerificationApi.submit(form);
      setVerification(response.data);
      setForm(asForm(response.data));
      setSuccess('Đã gửi hồ sơ xác minh. Trong thời gian chờ admin duyệt lại, bạn chưa thể tạo sự kiện mới.');
    } catch (err) {
      setError(err.response?.data?.message || 'Gửi hồ sơ xác minh thất bại.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Xác minh tổ chức</h1>
          <p className="text-sm text-gray-500 mt-1">
            Organizer cần được admin duyệt hồ sơ trước khi tạo sự kiện mới.
          </p>
        </div>
        <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-sm font-semibold ${statusInfo.className}`}>
          {statusInfo.label}
        </span>
      </div>

      {verification?.adminNote && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">Phản hồi từ admin</p>
          <p className="mt-1">{verification.adminNote}</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <i className="fa-solid fa-circle-exclamation mr-2" />
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <i className="fa-solid fa-circle-check mr-2" />
          {success}
        </div>
      )}

      {isVerified && (
        <div className="space-y-3">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Hồ sơ đã được xác minh. Bạn có thể tạo sự kiện mới và gửi lên admin duyệt nội dung sự kiện.
            <Link to="/events/create" className="ml-2 font-semibold text-emerald-700 underline">
              Tạo sự kiện
            </Link>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Nếu chỉnh sửa và gửi lại hồ sơ, trạng thái sẽ chuyển về <strong>chờ admin duyệt</strong>. Trong thời gian đó bạn sẽ tạm thời không thể tạo sự kiện mới.
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên tổ chức *</label>
            <input
              className="input-field"
              value={form.organizationName}
              onChange={(e) => set('organizationName', e.target.value)}
              
              required
              placeholder="VD: CLB Tình nguyện MTA"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Người đại diện *</label>
            <input
              className="input-field"
              value={form.representativeName}
              onChange={(e) => set('representativeName', e.target.value)}
              
              required
              placeholder="Họ tên người chịu trách nhiệm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email liên hệ *</label>
            <input
              type="email"
              className="input-field"
              value={form.contactEmail}
              onChange={(e) => set('contactEmail', e.target.value)}
              
              required
              placeholder="contact@example.org"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
            <input
              className="input-field"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              
              placeholder="Số liên hệ khi cần xác minh"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ hoạt động</label>
          <input
            className="input-field"
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
            
            placeholder="Địa chỉ hoặc khu vực tổ chức thường hoạt động"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website / trang giới thiệu</label>
            <input
              type="url"
              className="input-field"
              value={form.websiteUrl}
              onChange={(e) => set('websiteUrl', e.target.value)}
              
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link tài liệu minh chứng</label>
            <input
              type="url"
              className="input-field"
              value={form.documentUrl}
              onChange={(e) => set('documentUrl', e.target.value)}
              
              placeholder="Google Drive, website, quyết định thành lập..."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả tổ chức *</label>
          <textarea
            rows={4}
            className="input-field resize-none"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            
            required
            placeholder="Lĩnh vực hoạt động, kinh nghiệm tổ chức, đối tượng phục vụ..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú gửi admin</label>
          <textarea
            rows={3}
            className="input-field resize-none"
            value={form.verificationNote}
            onChange={(e) => set('verificationNote', e.target.value)}
            
            placeholder="Thông tin bổ sung giúp admin kiểm tra nhanh hơn"
          />
        </div>

        <label className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
          <input
            type="checkbox"
            className="mt-1"
            checked={form.commitmentAccepted}
            onChange={(e) => set('commitmentAccepted', e.target.checked)}
            
            required
          />
          <span>
            Tôi cam kết thông tin tổ chức là đúng và chịu trách nhiệm với các sự kiện được đăng trên VolunteerHub.
          </span>
        </label>

        <div className="flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <i className="fa-solid fa-paper-plane" />
              {isVerified ? 'Gửi chỉnh sửa để duyệt lại' : 'Gửi hồ sơ xác minh'}
            </button>
          </div>
      </form>
    </div>
  );
}
