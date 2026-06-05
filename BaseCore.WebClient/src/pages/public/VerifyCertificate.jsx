import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { certificateApi } from '../../services/api';

export default function VerifyCertificate() {
  const { code } = useParams();
  const [query, setQuery] = useState(code && code !== 'check' ? code : '');
  const [cert, setCert] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (code && code !== 'check') search(code);
  }, []);

  const search = async (c) => {
    const q = c || query;
    if (!q.trim()) return;
    setLoading(true); setError(''); setCert(null);
    try {
      const res = await certificateApi.verify(q.trim());
      setCert(res.data);
    } catch {
      setError('Không tìm thấy chứng chỉ với mã này');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-100 rounded-2xl mb-4">
          <i className="fa-solid fa-certificate text-primary-600 text-2xl" />
        </div>
        <h1 className="text-2xl font-bold text-warmink">Tra cứu chứng chỉ</h1>
        <p className="text-warmink-2 text-sm mt-1">Nhập mã chứng chỉ để xác thực</p>
      </div>

      {/* Search */}
      <div className="card p-6 mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="Nhập mã chứng chỉ (VD: CERT-2024-XXXXXX)"
            className="input-field flex-1"
          />
          <button onClick={() => search()} disabled={loading} className="btn-primary px-5 flex items-center gap-2">
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <i className="fa-solid fa-magnifying-glass" />}
            Tra cứu
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="card p-6 text-center">
          <i className="fa-solid fa-circle-xmark text-red-400 text-4xl mb-3 block" />
          <p className="text-red-600 font-medium">{error}</p>
          <p className="text-warmink-3 text-sm mt-1">Vui lòng kiểm tra lại mã chứng chỉ</p>
        </div>
      )}

      {/* Result */}
      {cert && (
        <div className="card overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-500 p-6 text-white text-center">
            <i className="fa-solid fa-certificate text-4xl mb-2 block" />
            <h2 className="text-xl font-bold">Chứng chỉ hợp lệ</h2>
            <p className="text-primary-100 text-sm mt-1">Mã: {cert.certificateCode}</p>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-warmink-3 uppercase tracking-wider mb-1">Tình nguyện viên</p>
                <p className="font-semibold text-warmink">{cert.volunteerName || cert.user?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-warmink-3 uppercase tracking-wider mb-1">Sự kiện</p>
                <p className="font-semibold text-warmink">{cert.eventTitle || cert.event?.title || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-warmink-3 uppercase tracking-wider mb-1">Giờ tình nguyện</p>
                <p className="font-semibold text-primary-600">{cert.volunteerHours} giờ</p>
              </div>
              <div>
                <p className="text-xs text-warmink-3 uppercase tracking-wider mb-1">Ngày cấp</p>
                <p className="font-semibold text-warmink">{new Date(cert.issuedAt).toLocaleDateString('vi-VN')}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
              <i className="fa-solid fa-circle-check text-green-500" />
              <p className="text-sm text-green-700 font-medium">Chứng chỉ này được xác thực bởi VolunteerHub</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
