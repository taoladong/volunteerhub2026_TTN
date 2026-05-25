import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { certificateApi } from '../../services/api';
import { Alert, PageHeader, StatusBadge, formatDate, getErrorMessage, unwrap } from '../../components/common/CommonUI';
import Icon from '../../components/common/Icon';

export default function CertificateVerify() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';
  const [code, setCode] = useState(initialCode);
  const [certificate, setCertificate] = useState(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const verify = async (event) => {
    event?.preventDefault?.();
    const normalized = code.trim();
    if (!normalized) {
      setError('Vui lòng nhập mã chứng nhận');
      return;
    }
    setLoading(true);
    setError('');
    setSearched(true);
    setSearchParams({ code: normalized });
    try {
      const res = await certificateApi.verify(normalized);
      setCertificate(unwrap(res, null));
    } catch (err) {
      setCertificate(null);
      setError(getErrorMessage(err, 'Không tìm thấy hoặc không xác thực được chứng nhận'));
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (initialCode) verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const certCode = certificate?.code || certificate?.certificateCode || code.trim();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        icon="verified"
        title="Xác thực chứng nhận"
        subtitle="Nhập mã chứng nhận để kiểm tra tính hợp lệ, sự kiện phát hành và thông tin tình nguyện viên."
      />

      <form onSubmit={verify} className="bg-white rounded-3xl shadow-soft border border-outline p-6 flex flex-col md:flex-row gap-3">
        <input
          className="input-field flex-1"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="VD: VH-CERT-2026-0001"
        />
        <button className="btn-primary" disabled={loading}>{loading ? 'Đang xác thực...' : 'Xác thực'}</button>
      </form>

      {error && <Alert type="error">{error}</Alert>}

      {certificate && (
        <div className="bg-white rounded-[2rem] shadow-soft border border-outline overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-tertiary p-8 text-white">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-3xl bg-white/20 flex items-center justify-center">
                <Icon name="military_tech" size={40} />
              </div>
              <div>
                <p className="uppercase tracking-[0.3em] text-white/80 text-label-sm font-bold">VolunteerHub Certificate</p>
                <h2 className="text-display-sm font-black mt-1">Chứng nhận hợp lệ</h2>
              </div>
            </div>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Info label="Mã chứng nhận" value={certCode} />
            <Info label="Trạng thái" value={<StatusBadge status={certificate.status || 'Verified'}>Đã xác thực</StatusBadge>} />
            <Info label="Tình nguyện viên" value={certificate.volunteerName || certificate.userName || certificate.fullName || '—'} />
            <Info label="Sự kiện" value={certificate.eventTitle || certificate.eventName || certificate.event?.title || '—'} />
            <Info label="Ngày cấp" value={formatDate(certificate.issuedAt || certificate.createdAt)} />
            <Info label="Số giờ ghi nhận" value={`${certificate.hours || certificate.totalHours || certificate.participationHours || 0} giờ`} />
            <div className="md:col-span-2">
              <Info label="Mô tả / ghi chú" value={certificate.description || certificate.note || certificate.summary || 'Chứng nhận được phát hành bởi VolunteerHub.'} />
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-3 pt-2">
              <a className="btn-secondary" href={certificateApi.getPdfUrl(certCode)} target="_blank" rel="noreferrer">
                Tải PDF
              </a>
              {certificate.qrUrl && <a className="btn-secondary" href={certificate.qrUrl} target="_blank" rel="noreferrer">Xem QR</a>}
            </div>
          </div>
        </div>
      )}

      {searched && !loading && !certificate && !error && (
        <div className="bg-white rounded-3xl border border-outline p-8 text-center text-on-surface-variant">
          Không có dữ liệu chứng nhận cho mã đã nhập.
        </div>
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-2xl bg-surface-variant/40 border border-outline p-4">
      <p className="text-label-sm font-bold uppercase tracking-wider text-on-surface-variant">{label}</p>
      <div className="mt-2 text-title-md font-bold text-on-surface">{value}</div>
    </div>
  );
}
