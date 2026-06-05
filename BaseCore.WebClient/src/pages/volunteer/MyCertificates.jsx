import React, { useState, useEffect } from 'react';
import { certificateApi } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';

function fmt(dt) {
  return dt ? new Date(dt).toLocaleDateString('vi-VN') : '';
}

export default function MyCertificates({ embedded = false }) {
  const [certs, setCerts]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [copied, setCopied]         = useState('');
  const [downloading, setDownloading] = useState('');

  useEffect(() => {
    certificateApi.getMyCertificates()
      .then((r) => setCerts(r.data || []))
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

  if (certs.length === 0) {
    return (
      <EmptyState
        icon="fa-certificate"
        title="Chưa có chứng chỉ nào"
        description="Tham gia và hoàn thành sự kiện để nhận chứng chỉ tình nguyện đầu tiên."
        cta="Khám phá sự kiện"
        ctaTo="/events"
      />
    );
  }

  const origin = window.location.origin;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {certs.map((c) => {
        const shareText     = encodeURIComponent(
          `Tôi vừa nhận chứng chỉ tình nguyện từ sự kiện "${c.event?.title}" — ${c.volunteerHours}h tình nguyện! 🎓`,
        );
        const shareUrl      = encodeURIComponent(`${origin}/verify/${c.certificateCode}`);
        const shareLinkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`;
        const shareFacebook = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&quote=${shareText}`;
        const isCopied      = copied === c.certificateCode;
        const isDownloading = downloading === c.certificateCode;

        return (
          <div
            key={c.id}
            className="rounded-xl overflow-hidden bg-white"
            style={{ border: '1px solid rgba(15,15,15,0.08)' }}
          >
            {/* ── Polaroid image — 4:3 ── */}
            <div
              className="aspect-[4/3] overflow-hidden relative"
              style={{ background: 'linear-gradient(135deg, #f0f5ff 0%, #e8f0ff 50%, #f5f0ff 100%)' }}
            >
              {c.event?.imageUrl ? (
                <img
                  src={c.event.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <i className="fa-solid fa-certificate text-5xl" style={{ color: 'rgba(27,97,201,0.15)' }} />
                </div>
              )}

              {/* Hours badge overlay */}
              <div className="absolute top-3 left-3">
                <span
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold"
                  style={{
                    background: 'rgba(255,255,255,0.92)',
                    color: '#1b61c9',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
                  }}
                >
                  <i className="fa-solid fa-clock text-[9px]" />
                  {c.volunteerHours}h
                </span>
              </div>
            </div>

            {/* ── Caption strip ── */}
            <div className="p-4">
              {/* Event title */}
              <h3
                className="text-[14px] font-semibold leading-snug line-clamp-2 mb-2"
                style={{ color: 'var(--c-ink)' }}
              >
                {c.event?.title || 'Chứng chỉ Tình nguyện'}
              </h3>

              {/* Issued date */}
              <p className="text-[11px] mb-3" style={{ color: 'rgba(15,15,15,0.45)' }}>
                <i className="fa-solid fa-calendar mr-1.5" style={{ color: 'rgba(15,15,15,0.25)' }} />
                Ngày cấp: {fmt(c.issuedAt)}
              </p>

              {/* Code copy row */}
              <div
                className="flex items-center gap-2 rounded-lg px-3 py-2 mb-3"
                style={{
                  background: 'rgba(15,15,15,0.03)',
                  border: '1px solid rgba(15,15,15,0.07)',
                }}
              >
                <code
                  className="text-[11px] flex-1 truncate"
                  style={{ color: 'rgba(15,15,15,0.55)' }}
                >
                  {c.certificateCode}
                </code>
                <button
                  type="button"
                  onClick={() => copyCode(c.certificateCode)}
                  className="flex-shrink-0 flex items-center gap-1 text-[11px] font-medium transition-colors"
                  style={{ color: isCopied ? '#16a34a' : '#1b61c9' }}
                >
                  <i className={`fa-solid ${isCopied ? 'fa-check' : 'fa-copy'} text-[10px]`} />
                  {isCopied ? 'Đã copy' : 'Copy'}
                </button>
              </div>

              {/* Action row */}
              <div
                className="flex items-center gap-2 pt-3 flex-wrap"
                style={{ borderTop: '1px solid rgba(15,15,15,0.06)' }}
              >
                {/* PDF */}
                <button
                  type="button"
                  onClick={() => openPdf(c.certificateCode)}
                  className="flex items-center gap-1 text-[11px] font-medium"
                  style={{ color: isDownloading ? 'rgba(15,15,15,0.35)' : 'rgba(15,15,15,0.55)' }}
                >
                  <i className={`fa-solid ${isDownloading ? 'fa-spinner fa-spin' : 'fa-file-pdf'} text-[10px]`} />
                  {isDownloading ? 'Đang tạo...' : 'PDF'}
                </button>

                {/* Verify link */}
                <a
                  href={verifyUrl(c.certificateCode)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] font-medium"
                  style={{ color: 'rgba(15,15,15,0.55)', textDecoration: 'none' }}
                >
                  <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
                  Xác thực
                </a>

                <div className="flex-1" />

                {/* Share LinkedIn */}
                <a
                  href={shareLinkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white no-underline"
                  style={{ background: '#0a66c2' }}
                >
                  <i className="fa-brands fa-linkedin text-[10px]" />
                  LinkedIn
                </a>

                {/* Share Facebook */}
                <a
                  href={shareFacebook}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white no-underline"
                  style={{ background: '#1877f2' }}
                >
                  <i className="fa-brands fa-facebook text-[10px]" />
                  FB
                </a>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
