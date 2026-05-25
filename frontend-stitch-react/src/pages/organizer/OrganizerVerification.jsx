import React, { useEffect, useState } from 'react';
import { organizerVerificationApi } from '../../services/api';
import Icon from '../../components/common/Icon';
import Loading from '../../components/common/Loading';
import { Alert, ImageUploader, getErrorMessage } from '../../components/common/CommonUI';

const INITIAL_FORM = {
  organizationName: '',
  representativeName: '',
  businessCode: '',
  contactEmail: '',
  phone: '',
  address: '',
  websiteUrl: '',
  description: '',
  documentUrl: '',
  verificationNote: '',
  commitmentAccepted: false,
};

const STATUS_INFO = {
  PendingVerification: { icon: 'hourglass_top', color: 'text-amber-600', bg: 'bg-warning-container', label: 'Đang chờ xét duyệt' },
  Pending: { icon: 'hourglass_top', color: 'text-amber-600', bg: 'bg-warning-container', label: 'Đang chờ xét duyệt' },
  Verified: { icon: 'check_circle', color: 'text-success', bg: 'bg-success-container', label: 'Đã được xác minh' },
  Approved: { icon: 'check_circle', color: 'text-success', bg: 'bg-success-container', label: 'Đã được xác minh' },
  Rejected: { icon: 'cancel', color: 'text-error', bg: 'bg-error-container', label: 'Bị từ chối' },
  ChangesRequested: { icon: 'edit_note', color: 'text-amber-600', bg: 'bg-warning-container', label: 'Yêu cầu bổ sung' },
};

const canShowForm = (verification) =>
  !verification ||
  verification.status === 'Unverified' ||
  verification.status === 'Rejected' ||
  verification.status === 'ChangesRequested';

const buildFormFromVerification = (verification) => ({
  organizationName: verification?.organizationName || '',
  representativeName: verification?.representativeName || '',
  businessCode: verification?.verificationNote?.startsWith('Mã số: ')
    ? verification.verificationNote.replace('Mã số: ', '')
    : '',
  contactEmail: verification?.contactEmail || '',
  phone: verification?.phone || '',
  address: verification?.address || '',
  websiteUrl: verification?.websiteUrl || '',
  description: verification?.description || '',
  documentUrl: verification?.documentUrl || '',
  verificationNote: verification?.verificationNote?.startsWith('Mã số: ') ? '' : verification?.verificationNote || '',
  commitmentAccepted: Boolean(verification?.commitmentAccepted),
});

export default function OrganizerVerification() {
  const [verification, setVerification] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    organizerVerificationApi.getMine()
      .then((res) => {
        const data = res.data;
        setVerification(data);
        setForm(buildFormFromVerification(data));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateForm = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const validate = () => {
    if (!form.organizationName.trim()) return 'Vui lòng nhập tên tổ chức.';
    if (!form.businessCode.trim()) return 'Vui lòng nhập mã số doanh nghiệp/tổ chức.';
    if (!form.representativeName.trim()) return 'Vui lòng nhập người đại diện.';
    if (!form.contactEmail.trim()) return 'Vui lòng nhập email liên hệ.';
    if (!form.description.trim()) return 'Vui lòng mô tả ngắn về tổ chức.';
    if (!form.documentUrl) return 'Vui lòng upload file/ảnh giấy phép hoạt động.';
    if (!form.commitmentAccepted) return 'Bạn cần cam kết chịu trách nhiệm về thông tin tổ chức.';
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        organizationName: form.organizationName.trim(),
        representativeName: form.representativeName.trim(),
        contactEmail: form.contactEmail.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        websiteUrl: form.websiteUrl.trim(),
        description: form.description.trim(),
        documentUrl: form.documentUrl,
        verificationNote: [`Mã số: ${form.businessCode.trim()}`, form.verificationNote.trim()].filter(Boolean).join(' | '),
        commitmentAccepted: form.commitmentAccepted,
      };
      const res = await organizerVerificationApi.submit(payload);
      setVerification(res.data);
      setForm(buildFormFromVerification(res.data));
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể gửi hồ sơ xác minh.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  const status = STATUS_INFO[verification?.status] || null;
  const showForm = canShowForm(verification);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-headline-lg font-bold text-on-surface">Xác minh tổ chức</h2>
        <p className="text-on-surface-variant">Gửi hồ sơ xác minh để được phê duyệt tạo sự kiện.</p>
      </div>

      {notice && <Alert type="success">{notice}</Alert>}

      {verification && status && !showForm && (
        <div className={`${status.bg} rounded-3xl p-8 border border-outline`}>
          <div className="flex items-center gap-4 mb-4">
            <Icon name={status.icon} className={status.color} size={32} />
            <h3 className="text-xl font-bold text-on-surface">{status.label}</h3>
          </div>
          <p className="text-on-surface-variant mb-4">
            {(verification.status === 'PendingVerification' || verification.status === 'Pending') && 'Hồ sơ của bạn đang được xem xét. Vui lòng chờ phản hồi từ quản trị viên.'}
            {(verification.status === 'Verified' || verification.status === 'Approved') && 'Tổ chức của bạn đã được xác minh. Bạn có thể tạo và quản lý sự kiện.'}
          </p>
          {verification.organizationName && (
            <p className="text-label-md text-on-surface font-bold mb-2">Tổ chức: {verification.organizationName}</p>
          )}
          {verification.documentUrl && (
            <a href={verification.documentUrl} target="_blank" rel="noreferrer" className="text-primary font-bold text-label-md hover:underline">
              Xem giấy phép đã gửi
            </a>
          )}
          {verification.submittedAt && (
            <p className="text-label-sm text-on-surface-variant mt-4">
              Ngày gửi: {new Date(verification.submittedAt).toLocaleDateString('vi-VN')}
            </p>
          )}
        </div>
      )}

      {showForm && verification?.status !== 'Unverified' && (
        <div className={`${status?.bg || 'bg-surface-variant'} rounded-3xl p-6 border border-outline`}>
          <div className="flex items-center gap-3 mb-2">
            <Icon name={status?.icon || 'info'} className={status?.color || 'text-on-surface-variant'} size={28} />
            <h3 className="text-title-md font-bold text-on-surface">{status?.label || 'Chưa gửi xác minh'}</h3>
          </div>
          <p className="text-on-surface-variant">
            {verification?.status === 'Rejected' && `Lý do: ${verification.rejectReason || verification.adminNote || 'Không đáp ứng yêu cầu.'}`}
            {verification?.status === 'ChangesRequested' && `Yêu cầu: ${verification.adminNote || verification.rejectReason || 'Vui lòng bổ sung thông tin.'}`}
          </p>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 shadow-soft border border-outline space-y-6">
          <div className="text-center">
            <Icon name="verified" size={48} className="text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold text-on-surface mb-2">
              {verification?.status === 'Rejected' || verification?.status === 'ChangesRequested' ? 'Gửi lại hồ sơ xác minh' : 'Gửi hồ sơ xác minh'}
            </h3>
            <p className="text-on-surface-variant max-w-2xl mx-auto">
              Điền thông tin tổ chức và upload giấy phép hoạt động để quản trị viên xét duyệt.
            </p>
          </div>

          {error && <Alert type="error">{error}</Alert>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label>
              <span className="text-label-sm font-medium text-on-surface-variant mb-1 block">Tên tổ chức *</span>
              <input className="input-field" value={form.organizationName} onChange={(e) => updateForm({ organizationName: e.target.value })} required />
            </label>

            <label>
              <span className="text-label-sm font-medium text-on-surface-variant mb-1 block">Mã số doanh nghiệp/tổ chức *</span>
              <input className="input-field" value={form.businessCode} onChange={(e) => updateForm({ businessCode: e.target.value })} required />
            </label>

            <label>
              <span className="text-label-sm font-medium text-on-surface-variant mb-1 block">Người đại diện *</span>
              <input className="input-field" value={form.representativeName} onChange={(e) => updateForm({ representativeName: e.target.value })} required />
            </label>

            <label>
              <span className="text-label-sm font-medium text-on-surface-variant mb-1 block">Email liên hệ *</span>
              <input className="input-field" type="email" value={form.contactEmail} onChange={(e) => updateForm({ contactEmail: e.target.value })} required />
            </label>

            <label>
              <span className="text-label-sm font-medium text-on-surface-variant mb-1 block">Số điện thoại</span>
              <input className="input-field" value={form.phone} onChange={(e) => updateForm({ phone: e.target.value })} />
            </label>

            <label>
              <span className="text-label-sm font-medium text-on-surface-variant mb-1 block">Website</span>
              <input className="input-field" value={form.websiteUrl} onChange={(e) => updateForm({ websiteUrl: e.target.value })} placeholder="https://..." />
            </label>

            <label className="md:col-span-2">
              <span className="text-label-sm font-medium text-on-surface-variant mb-1 block">Địa chỉ</span>
              <input className="input-field" value={form.address} onChange={(e) => updateForm({ address: e.target.value })} />
            </label>

            <label className="md:col-span-2">
              <span className="text-label-sm font-medium text-on-surface-variant mb-1 block">Mô tả tổ chức *</span>
              <textarea className="input-field min-h-28" value={form.description} onChange={(e) => updateForm({ description: e.target.value })} required />
            </label>

            <label className="md:col-span-2">
              <span className="text-label-sm font-medium text-on-surface-variant mb-1 block">Ghi chú bổ sung</span>
              <textarea className="input-field min-h-20" value={form.verificationNote} onChange={(e) => updateForm({ verificationNote: e.target.value })} />
            </label>

            <div className="md:col-span-2">
              <ImageUploader
                label="Upload giấy phép hoạt động *"
                value={form.documentUrl}
                accept="image/*,.pdf"
                onUpload={(url) => updateForm({ documentUrl: url })}
              />
            </div>
          </div>

          <label className="flex items-start gap-3 p-4 rounded-2xl border border-outline bg-surface-variant/30">
            <input
              type="checkbox"
              checked={form.commitmentAccepted}
              onChange={(e) => updateForm({ commitmentAccepted: e.target.checked })}
              className="mt-1 w-5 h-5 accent-primary"
            />
            <span className="text-body-sm text-on-surface-variant">
              Tôi cam kết các thông tin đã cung cấp là chính xác và chịu trách nhiệm trước pháp luật/hệ thống về hoạt động tổ chức.
            </span>
          </label>

          <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={saving}>
            {saving ? <Icon name="progress_activity" size={20} className="animate-spin" /> : <Icon name="upload" size={20} />}
            Gửi hồ sơ xác minh
          </button>
        </form>
      )}
    </div>
  );
}
