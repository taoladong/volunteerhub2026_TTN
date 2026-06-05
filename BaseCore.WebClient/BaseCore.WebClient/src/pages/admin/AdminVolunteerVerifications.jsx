import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ImageLightbox from '../../components/ui/ImageLightbox';

const STATUS = {
  PendingVerification: { label: 'Chờ xác minh', className: 'bg-amber-100 text-amber-700' },
  Verified: { label: 'Đã xác minh', className: 'bg-emerald-100 text-emerald-700' },
  Rejected: { label: 'Bị từ chối', className: 'bg-red-100 text-red-700' },
  SelfDeclared: { label: 'Tự khai', className: 'bg-gray-100 text-gray-600' },
  Unverified: { label: 'Chưa xác minh', className: 'bg-gray-100 text-gray-600' },
};

function Pill({ value }) {
  const status = STATUS[value] || STATUS.PendingVerification;
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${status.className}`}>{status.label}</span>;
}

function EvidenceLink({ href, label }) {
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700">
      <i className="fa-solid fa-arrow-up-right-from-square" />
      {label}
    </a>
  );
}

export default function AdminVolunteerVerifications() {
  const [tab, setTab] = useState('kyc');
  const [status, setStatus] = useState('PendingVerification');
  const [kycItems, setKycItems] = useState([]);
  const [skillItems, setSkillItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      if (tab === 'kyc') {
        const res = await adminApi.getVolunteerKycRequests({ status });
        setKycItems(res.data || []);
      } else {
        const res = await adminApi.getVolunteerSkillVerifications({ status });
        setSkillItems(res.data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tab, status]);

  const reviewKyc = async (item, action) => {
    setActingId(`kyc-${item.id}`);
    try {
      if (action === 'approve') await adminApi.approveVolunteerKyc(item.id, { note: '' });
      else await adminApi.rejectVolunteerKyc(item.id, { note: 'Hồ sơ chưa đạt yêu cầu xác minh.' });
      setMsg('Đã cập nhật hồ sơ KYC.');
      await load();
    } finally {
      setActingId('');
    }
  };

  const reviewSkill = async (item, action) => {
    setActingId(`skill-${item.id}`);
    try {
      if (action === 'approve') await adminApi.approveVolunteerSkill(item.id, { note: '' });
      else await adminApi.rejectVolunteerSkill(item.id, { note: 'Minh chứng chưa đủ để xác minh.' });
      setMsg('Đã cập nhật xác minh kỹ năng.');
      await load();
    } finally {
      setActingId('');
    }
  };

  const items = tab === 'kyc' ? kycItems : skillItems;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Duyệt volunteer</h1>
          <p className="mt-1 text-sm text-gray-500">Xác minh danh tính KYC và minh chứng kỹ năng/ngôn ngữ.</p>
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field w-full sm:w-56">
          <option value="PendingVerification">Chờ xác minh</option>
          <option value="Verified">Đã xác minh</option>
          <option value="Rejected">Bị từ chối</option>
          <option value="">Tất cả</option>
        </select>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => setTab('kyc')} className={`btn-sm ${tab === 'kyc' ? 'btn-primary' : 'btn-secondary'}`}>
          <i className="fa-solid fa-id-card mr-1" /> KYC
        </button>
        <button type="button" onClick={() => setTab('skills')} className={`btn-sm ${tab === 'skills' ? 'btn-primary' : 'btn-secondary'}`}>
          <i className="fa-solid fa-star mr-1" /> Kỹ năng
        </button>
      </div>

      {msg && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{msg}</div>}

      {loading ? (
        <LoadingSpinner />
      ) : items.length === 0 ? (
        <div className="card p-8 text-center text-sm text-gray-500">Không có hồ sơ nào trong trạng thái này.</div>
      ) : tab === 'kyc' ? (
        <div className="space-y-3">
          {kycItems.map((item) => (
            <div key={item.id} className="card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-gray-900">{item.volunteerName || `Volunteer #${item.userId}`}</p>
                    <Pill value={item.kycStatus} />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{item.volunteerEmail}</p>
                  <a href={`/profile/${item.userId}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline mt-1 inline-block">
                    <i className="fa-solid fa-user mr-1" />Xem hồ sơ volunteer
                  </a>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <ImageLightbox src={item.identityFrontImageUrl} alt="CCCD mặt trước" label="CCCD trước" className="w-24 h-16" />
                    <ImageLightbox src={item.identityBackImageUrl} alt="CCCD mặt sau" label="CCCD sau" className="w-24 h-16" />
                    <ImageLightbox src={item.portraitImageUrl} alt="Ảnh chân dung" label="Chân dung" className="w-16 h-20" />
                  </div>
                  {item.kycAdminNote && <p className="mt-3 text-sm text-gray-600">Ghi chú: {item.kycAdminNote}</p>}
                </div>
                {item.kycStatus === 'PendingVerification' && (
                  <div className="flex shrink-0 gap-2">
                    <button type="button" disabled={actingId === `kyc-${item.id}`} onClick={() => reviewKyc(item, 'approve')} className="btn-primary btn-sm">
                      Duyệt
                    </button>
                    <button type="button" disabled={actingId === `kyc-${item.id}`} onClick={() => reviewKyc(item, 'reject')} className="btn-danger btn-sm">
                      Từ chối
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {skillItems.map((item) => (
            <div key={item.id} className="card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-gray-900">{item.skillName}</p>
                    <Pill value={item.verificationStatus} />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {item.volunteerName || `Volunteer #${item.userId}`} · {item.volunteerEmail} · {item.level}
                  </p>
                  {item.verificationNote && <p className="mt-2 text-sm text-gray-600">{item.verificationNote}</p>}
                  <div className="mt-3">
                    <EvidenceLink href={item.evidenceUrl} label="Mở minh chứng" />
                  </div>
                  {item.adminNote && <p className="mt-3 text-sm text-gray-600">Ghi chú: {item.adminNote}</p>}
                </div>
                {item.verificationStatus === 'PendingVerification' && (
                  <div className="flex shrink-0 gap-2">
                    <button type="button" disabled={actingId === `skill-${item.id}`} onClick={() => reviewSkill(item, 'approve')} className="btn-primary btn-sm">
                      Duyệt
                    </button>
                    <button type="button" disabled={actingId === `skill-${item.id}`} onClick={() => reviewSkill(item, 'reject')} className="btn-danger btn-sm">
                      Từ chối
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
