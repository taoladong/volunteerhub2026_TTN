import React, { useState } from 'react';
import { adminApi } from '../../services/api';

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminExport() {
  const [loading, setLoading] = useState({});

  const exportData = async (type, format) => {
    const key = `${type}_${format}`;
    setLoading((prev) => ({ ...prev, [key]: true }));

    try {
      const fn = type === 'events' ? adminApi.exportEvents : type === 'users' ? adminApi.exportUsers : adminApi.exportFinance;
      const r = await fn(format);
      const ext = format === 'csv' ? 'csv' : 'json';
      const mimeType = format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8';
      const content = format === 'csv' ? r.data : JSON.stringify(r.data, null, 2);
      const blob = new Blob([content], { type: mimeType });
      downloadBlob(blob, `${type}_export_${new Date().toISOString().slice(0, 10)}.${ext}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Xuất dữ liệu thất bại');
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const exportCards = [
    {
      title: 'Sự kiện',
      description: 'Xuất toàn bộ dữ liệu sự kiện bao gồm trạng thái, ban tổ chức và thông tin chi tiết.',
      icon: 'fa-calendar',
      type: 'events',
      color: 'text-primary-600',
      bg: 'bg-primary-50',
    },
    {
      title: 'Người dùng',
      description: 'Xuất danh sách người dùng với vai trò, trạng thái hoạt động và thông tin hồ sơ.',
      icon: 'fa-users',
      type: 'users',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Tài chính',
      description: 'Xuất campaign ủng hộ, đề nghị tài trợ, số tiền xác nhận/đã nhận và báo cáo sử dụng tiền.',
      icon: 'fa-hand-holding-dollar',
      type: 'finance',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Xuất dữ liệu</h1>
        <p className="text-sm text-gray-500 mt-0.5">Tải xuống dữ liệu hệ thống ở định dạng CSV hoặc JSON</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {exportCards.map((card) => (
          <div key={card.type} className="card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 ${card.bg} rounded-xl flex items-center justify-center`}>
                <i className={`fa-solid ${card.icon} ${card.color} text-xl`} />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Dữ liệu {card.title}</h2>
              </div>
            </div>
            <p className="text-sm text-gray-500">{card.description}</p>
            <div className="flex gap-3">
              <button
                onClick={() => exportData(card.type, 'csv')}
                disabled={loading[`${card.type}_csv`]}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                {loading[`${card.type}_csv`]
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <i className="fa-solid fa-file-csv" />}
                CSV
              </button>
              <button
                onClick={() => exportData(card.type, 'json')}
                disabled={loading[`${card.type}_json`]}
                className="flex-1 btn-secondary flex items-center justify-center gap-2"
              >
                {loading[`${card.type}_json`]
                  ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  : <i className="fa-solid fa-file-code" />}
                JSON
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-5 bg-yellow-50 border-yellow-200">
        <div className="flex gap-3">
          <i className="fa-solid fa-circle-info text-yellow-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-yellow-800 space-y-1">
            <p className="font-medium">Lưu ý khi xuất dữ liệu</p>
            <ul className="list-disc list-inside text-yellow-700 space-y-0.5 text-xs">
              <li>Dữ liệu xuất bao gồm toàn bộ records trong hệ thống</li>
              <li>File CSV có thể mở trực tiếp bằng Excel hoặc Google Sheets</li>
              <li>File JSON phù hợp cho import vào hệ thống khác</li>
              <li>Dữ liệu nhạy cảm đã được lọc bỏ (mật khẩu, token)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
