import React, { useState, useEffect } from 'react';
import { certificateApi } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

function fmt(dt) { return dt ? new Date(dt).toLocaleDateString('vi-VN') : ''; }

export default function MyCertificates() {
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState('');
  const [downloading, setDownloading] = useState('');

  useEffect(() => {
    certificateApi.getMyCertificates()
      .then(r => setCerts(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const copyCode = (code) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(''), 2000);
  };

  const verifyUrl = (code) => `${window.location.origin}/verify/${code}`;
  const openPdf = (code) => {
    setDownloading(code);
    window.open(certificateApi.getPdfUrl(code), '_blank', 'noopener,noreferrer');
    setTimeout(() => setDownloading(''), 3000);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Chứng chỉ của tôi</h1>
        <p className="text-sm text-gray-500 mt-0.5">{certs.length} chứng chỉ tình nguyện</p>
      </div>

      {certs.length === 0 ? (
        <div className="card p-12 text-center">
          <i className="fa-solid fa-certificate text-5xl text-gray-300 mb-4 block" />
          <p className="text-gray-500 font-medium">Chưa có chứng chỉ nào</p>
          <p className="text-gray-400 text-sm mt-1">Tham gia và hoàn thành sự kiện để nhận chứng chỉ</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {certs.map(c => (
            <div key={c.id} className="card overflow-hidden">
              <div className="bg-gradient-to-r from-primary-600 to-primary-500 p-4 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <i className="fa-solid fa-certificate" />
                  <span className="text-sm font-medium">Chứng chỉ Tình nguyện</span>
                </div>
                <h3 className="font-bold line-clamp-2 text-white">{c.event?.title}</h3>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Giờ tình nguyện</span>
                  <span className="font-bold text-primary-600">{c.volunteerHours}h</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Ngày cấp</span>
                  <span className="font-medium text-gray-900">{fmt(c.issuedAt)}</span>
                </div>

                <div className="bg-gray-50 rounded-lg p-2 flex items-center gap-2">
                  <code className="text-xs text-gray-600 flex-1 truncate">{c.certificateCode}</code>
                  <button onClick={() => copyCode(c.certificateCode)} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex-shrink-0">
                    {copied === c.certificateCode ? <><i className="fa-solid fa-check" /> Đã copy</> : <><i className="fa-solid fa-copy" /> Copy</>}
                  </button>
                </div>

                <a href={verifyUrl(c.certificateCode)} target="_blank" rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 text-xs text-primary-600 hover:underline">
                  <i className="fa-solid fa-external-link" /> Xem trang xác thực
                </a>
                <button type="button" onClick={() => openPdf(c.certificateCode)}
                  className="mx-auto flex items-center justify-center gap-1.5 text-xs text-primary-600 hover:underline">
                  <i className={`fa-solid ${downloading === c.certificateCode ? 'fa-clock' : 'fa-file-pdf'}`} />
                  {downloading === c.certificateCode ? 'PDF đang được tạo...' : 'Tải PDF'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
