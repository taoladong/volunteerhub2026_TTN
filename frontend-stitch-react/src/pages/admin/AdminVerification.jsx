import React, { useEffect, useMemo, useState } from 'react';
import { adminApi } from '../../services/api';
import Icon from '../../components/common/Icon';
import Loading from '../../components/common/Loading';
import { Alert, EmptyState, StatusBadge, getErrorMessage, unwrap } from '../../components/common/CommonUI';

const tabs = [
  { key: 'kyc', label: 'Xác minh KYC', icon: 'badge' },
  { key: 'skill', label: 'Xác minh kỹ năng', icon: 'psychology' },
  { key: 'org', label: 'Xác minh tổ chức', icon: 'business' },
];

const getTitle = (tab, item) => {
  if (tab === 'org') return item.organizationName || item.organizerName || item.organizerUserName || 'Tổ chức chưa có tên';
  if (tab === 'skill') return item.volunteerName || item.userName || 'Volunteer';
  return item.volunteerName || item.fullName || item.userName || 'Volunteer';
};

const getSubtitle = (tab, item) => {
  if (tab === 'org') return item.contactEmail || item.organizerUserName || '';
  if (tab === 'skill') return [item.skillName, item.level].filter(Boolean).join(' · ');
  return item.volunteerEmail || item.email || '';
};

const getStatus = (tab, item) => {
  if (tab === 'org') return item.status;
  if (tab === 'skill') return item.verificationStatus;
  return item.kycStatus;
};

const formatDateTime = (value) => {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
  return date.toLocaleString('vi-VN');
};

function DetailRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-on-surface">{value}</p>
    </div>
  );
}

function EvidenceLink({ label, url }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-xl border border-outline bg-white px-3 py-2 text-sm font-bold text-primary hover:bg-primary-container"
    >
      <Icon name="open_in_new" size={18} />
      {label}
    </a>
  );
}

function VerificationDetails({ tab, item }) {
  if (tab === 'org') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DetailRow label="Người đại diện" value={item.representativeName} />
          <DetailRow label="Điện thoại" value={item.phone} />
          <DetailRow label="Địa chỉ" value={item.address} />
          <DetailRow label="Website" value={item.websiteUrl} />
          <DetailRow label="Ngày gửi" value={formatDateTime(item.submittedAt)} />
          <DetailRow label="Ghi chú hồ sơ" value={item.verificationNote} />
        </div>
        <DetailRow label="Mô tả tổ chức" value={item.description} />
        <div className="flex flex-wrap gap-2">
          <EvidenceLink label="Xem tài liệu xác minh" url={item.documentUrl} />
        </div>
      </div>
    );
  }

  if (tab === 'skill') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DetailRow label="Email volunteer" value={item.volunteerEmail} />
          <DetailRow label="Nhóm kỹ năng" value={item.skillCategory} />
          <DetailRow label="Cấp độ" value={item.level} />
          <DetailRow label="Ngày gửi" value={formatDateTime(item.verificationSubmittedAt)} />
        </div>
        <DetailRow label="Ghi chú của volunteer" value={item.verificationNote} />
        <div className="flex flex-wrap gap-2">
          <EvidenceLink label="Xem minh chứng kỹ năng" url={item.evidenceUrl} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DetailRow label="Email volunteer" value={item.volunteerEmail} />
        <DetailRow label="Ngày gửi" value={formatDateTime(item.kycSubmittedAt)} />
      </div>
      <div className="flex flex-wrap gap-2">
        <EvidenceLink label="Mặt trước CCCD" url={item.identityFrontImageUrl} />
        <EvidenceLink label="Mặt sau CCCD" url={item.identityBackImageUrl} />
        <EvidenceLink label="Ảnh chân dung" url={item.portraitImageUrl} />
      </div>
    </div>
  );
}

export default function AdminVerification() {
  const [activeTab, setActiveTab] = useState('kyc');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const activeMeta = useMemo(() => tabs.find((tab) => tab.key === activeTab) || tabs[0], [activeTab]);

  const fetchData = async (tab = activeTab) => {
    setLoading(true);
    setError('');
    try {
      const res = tab === 'kyc'
        ? await adminApi.getVolunteerKycRequests({ status: 'PendingVerification' })
        : tab === 'skill'
          ? await adminApi.getVolunteerSkillVerifications({ status: 'PendingVerification' })
          : await adminApi.getOrganizerVerifications({ status: 'PendingVerification' });
      const list = unwrap(res, []);
      setItems(Array.isArray(list) ? list : []);
    } catch (err) {
      setItems([]);
      setError(getErrorMessage(err, 'Không tải được danh sách yêu cầu xác minh.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const runReview = async (item, action) => {
    const id = item.id;
    const noteRequired = action !== 'approve';
    const note = noteRequired
      ? window.prompt(action === 'requestChanges' ? 'Nhập nội dung cần bổ sung:' : 'Nhập lý do từ chối:')
      : '';

    if (noteRequired) {
      if (note == null) return;
      if (note.trim().length < 10) {
        setError('Lý do phải có ít nhất 10 ký tự.');
        return;
      }
    }

    setBusyId(id);
    setError('');
    setNotice('');
    try {
      if (activeTab === 'kyc') {
        if (action === 'approve') await adminApi.approveVolunteerKyc(id, { note: 'Approved by admin' });
        else await adminApi.rejectVolunteerKyc(id, { note: note.trim() });
      } else if (activeTab === 'skill') {
        if (action === 'approve') await adminApi.approveVolunteerSkill(id, { note: 'Approved by admin' });
        else await adminApi.rejectVolunteerSkill(id, { note: note.trim() });
      } else if (action === 'requestChanges') {
        await adminApi.requestOrganizerVerificationChanges(id, { note: note.trim() });
      } else if (action === 'approve') {
        await adminApi.approveOrganizerVerification(id, { note: 'Approved by admin' });
      } else {
        await adminApi.rejectOrganizerVerification(id, { note: note.trim() });
      }

      setNotice(action === 'approve' ? 'Đã duyệt hồ sơ xác minh.' : 'Đã cập nhật trạng thái hồ sơ.');
      await fetchData(activeTab);
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể xử lý yêu cầu xác minh.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-headline-lg font-bold text-on-surface">Xác minh & Phê duyệt</h2>
        <p className="text-on-surface-variant">Duyệt hồ sơ danh tính, kỹ năng và pháp lý tổ chức.</p>
      </div>

      <div className="flex w-fit flex-wrap gap-2 rounded-2xl border border-outline bg-surface-variant p-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setActiveTab(tab.key);
              setNotice('');
              setError('');
            }}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-label-md font-bold transition-all ${
              activeTab === tab.key ? 'border border-outline bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Icon name={tab.icon} size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {notice && <Alert type="success">{notice}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      {loading ? <Loading /> : items.length === 0 ? (
        <EmptyState
          icon="check_circle"
          title="Không có yêu cầu nào"
          description={`Tất cả yêu cầu ${activeMeta.label.toLowerCase()} đã được xử lý.`}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-3xl border border-outline bg-white p-6 shadow-soft">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-container text-primary">
                    <Icon name={activeMeta.icon} size={24} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-on-surface">{getTitle(activeTab, item)}</h4>
                    <p className="text-label-sm text-on-surface-variant">{getSubtitle(activeTab, item)}</p>
                  </div>
                </div>
                <StatusBadge status={getStatus(activeTab, item)}>{getStatus(activeTab, item) || 'Chờ duyệt'}</StatusBadge>
              </div>

              <VerificationDetails tab={activeTab} item={item} />

              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => runReview(item, 'approve')}
                  disabled={busyId === item.id}
                  className="btn-primary flex flex-1 items-center justify-center gap-2 py-2.5 text-sm"
                >
                  <Icon name="check" size={18} />
                  Duyệt
                </button>
                {activeTab === 'org' && (
                  <button
                    type="button"
                    onClick={() => runReview(item, 'requestChanges')}
                    disabled={busyId === item.id}
                    className="btn-secondary flex flex-1 items-center justify-center gap-2 py-2.5 text-sm"
                  >
                    <Icon name="edit_note" size={18} />
                    Yêu cầu bổ sung
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => runReview(item, 'reject')}
                  disabled={busyId === item.id}
                  className="btn-danger flex flex-1 items-center justify-center gap-2 py-2.5 text-sm"
                >
                  <Icon name="close" size={18} />
                  Từ chối
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
