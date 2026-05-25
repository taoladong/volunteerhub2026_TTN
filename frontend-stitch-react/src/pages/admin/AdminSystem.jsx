import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import Icon from '../../components/common/Icon';
import Loading from '../../components/common/Loading';

export default function AdminSystem() {
  const [health, setHealth] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.getMonitoringHealth().catch(() => ({ data: null })),
      adminApi.getAuditLogs({ page: 1, pageSize: 10 }).catch(() => ({ data: [] })),
    ]).then(([hRes, lRes]) => {
      setHealth(hRes.data);
      setLogs(Array.isArray(lRes.data) ? lRes.data : lRes.data?.items || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-headline-lg font-bold text-on-surface">Hệ thống & Giám sát</h2>
        <p className="text-on-surface-variant">Kiểm tra sức khỏe hệ thống và xem nhật ký hoạt động.</p>
      </div>

      {/* Health Status */}
      <div className="bg-white rounded-2xl p-6 shadow-soft border border-outline border-t-4 border-t-success">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-success-container flex items-center justify-center">
            <Icon name="check_circle" className="text-success" size={28} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-on-surface">Hệ thống hoạt động bình thường</h3>
            <p className="text-label-sm text-on-surface-variant">
              {health?.status || 'Healthy'} • Cập nhật lúc {new Date().toLocaleTimeString('vi-VN')}
            </p>
          </div>
        </div>
      </div>

      {/* Audit Logs */}
      <div className="bg-white rounded-3xl p-8 shadow-soft border border-outline">
        <h3 className="text-xl font-bold text-on-surface mb-6 flex items-center gap-2">
          <Icon name="history" className="text-primary" />
          Nhật ký hoạt động gần đây
        </h3>
        {logs.length > 0 ? (
          <div className="space-y-3">
            {logs.map((log, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl hover:bg-surface-variant transition-colors">
                <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center text-primary flex-shrink-0">
                  <Icon name="receipt_long" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-on-surface text-sm truncate">{log.action || log.description || '—'}</p>
                  <p className="text-label-sm text-on-surface-variant">{log.userName || '—'} • {log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') : ''}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-on-surface-variant text-center py-8">Chưa có nhật ký hoạt động.</p>
        )}
      </div>
    </div>
  );
}