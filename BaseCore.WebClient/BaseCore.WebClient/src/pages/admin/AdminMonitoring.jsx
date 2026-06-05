import React, { useEffect, useMemo, useState } from 'react';
import { adminApi } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Pagination from '../../components/ui/Pagination';

const PAGE_SIZE = 25;
const EMPTY_FILTERS = { action: '', entityType: '' };

function formatDate(value) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value));
}

function statusTone(status) {
  return status === 'Healthy'
    ? { bg: 'bg-green-50', text: 'text-green-700', icon: 'fa-circle-check' }
    : { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: 'fa-triangle-exclamation' };
}

function StatTile({ label, value, icon, tone = 'text-primary-600' }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
        <i className={`fa-solid ${icon} ${tone}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value ?? '-'}</p>
      </div>
    </div>
  );
}

export default function AdminMonitoring() {
  const [health, setHealth] = useState(null);
  const [summary, setSummary] = useState(null);
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState('');

  const healthTone = useMemo(() => statusTone(health?.status), [health?.status]);

  const loadOverview = async () => {
    const [healthResult, summaryResult] = await Promise.all([
      adminApi.getMonitoringHealth(),
      adminApi.getMonitoringSummary(),
    ]);

    setHealth(healthResult.data);
    setSummary(summaryResult.data);
  };

  const loadLogs = async (nextPage = page, nextFilters = appliedFilters) => {
    setLogsLoading(true);
    try {
      const params = {
        page: nextPage,
        pageSize: PAGE_SIZE,
        action: nextFilters.action || undefined,
        entityType: nextFilters.entityType || undefined,
      };
      const r = await adminApi.getAuditLogs(params);
      setLogs(r.data?.items || []);
      setTotalPages(r.data?.totalPages || 1);
    } finally {
      setLogsLoading(false);
    }
  };

  const loadAll = async () => {
    setError('');
    setLoading(true);
    try {
      await loadOverview();
      await loadLogs(1, appliedFilters);
      setPage(1);
    } catch (err) {
      setError(err.response?.data?.message || 'Không tải được dữ liệu giám sát.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) {
      loadLogs(page, appliedFilters).catch((err) => {
        setError(err.response?.data?.message || 'Không tải được audit log.');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, appliedFilters]);

  const applyFilters = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setPage(1);
    setAppliedFilters({
      action: String(formData.get('action') || '').trim(),
      entityType: String(formData.get('entityType') || '').trim(),
    });
  };

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPage(1);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Giám sát hệ thống</h1>
          <p className="text-sm text-gray-500 mt-0.5">Theo dõi sức khỏe dịch vụ, số liệu vận hành và audit log thao tác nhạy cảm.</p>
        </div>
        <button onClick={loadAll} className="btn-secondary flex items-center gap-2">
          <i className="fa-solid fa-rotate-right" /> Làm mới
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <i className="fa-solid fa-circle-exclamation mr-2" />
          {error}
        </div>
      )}

      <div className={`card p-4 ${healthTone.bg}`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
              <i className={`fa-solid ${healthTone.icon} ${healthTone.text}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{health?.service || 'BaseCore.APIService'}</p>
              <p className={`text-xs ${healthTone.text}`}>{health?.status || '-'} - Database: {health?.database || '-'}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">UTC: {formatDate(health?.utc)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatTile label="Người dùng" value={summary?.totals?.users} icon="fa-users" />
        <StatTile label="Sự kiện" value={summary?.totals?.events} icon="fa-calendar-days" tone="text-blue-600" />
        <StatTile label="Đăng ký" value={summary?.totals?.registrations} icon="fa-clipboard-list" tone="text-violet-600" />
        <StatTile label="Audit logs" value={summary?.totals?.auditLogs} icon="fa-shield-halved" tone="text-red-600" />
        <StatTile label="Nhà tài trợ" value={summary?.totals?.sponsors} icon="fa-hand-holding-dollar" tone="text-amber-600" />
        <StatTile label="Chứng chỉ" value={summary?.totals?.certificates} icon="fa-certificate" tone="text-emerald-600" />
        <StatTile label="Log 24h" value={summary?.last24h?.auditLogs} icon="fa-clock-rotate-left" tone="text-slate-600" />
        <StatTile label="Certificate job lỗi" value={summary?.last24h?.certificateJobsFailed} icon="fa-triangle-exclamation" tone="text-orange-600" />
      </div>

      <div className="card p-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-semibold text-gray-900">Audit log</h2>
          {logsLoading && <span className="text-xs text-gray-500">Đang tải...</span>}
        </div>

        <form onSubmit={applyFilters} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto] gap-3">
          <input
            name="action"
            type="text"
            value={filters.action}
            onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
            onInput={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
            className="input-field text-sm"
            placeholder="Lọc theo action"
          />
          <input
            name="entityType"
            type="text"
            value={filters.entityType}
            onChange={(e) => setFilters((f) => ({ ...f, entityType: e.target.value }))}
            onInput={(e) => setFilters((f) => ({ ...f, entityType: e.target.value }))}
            className="input-field text-sm"
            placeholder="Lọc theo entity"
          />
          <button type="submit" className="btn-primary flex items-center justify-center gap-2">
            <i className="fa-solid fa-filter" /> Lọc
          </button>
          <button type="button" onClick={resetFilters} className="btn-secondary flex items-center justify-center gap-2">
            <i className="fa-solid fa-xmark" /> Xóa lọc
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="text-left px-4 py-3">Thời gian</th>
                <th className="text-left px-4 py-3">Người dùng</th>
                <th className="text-left px-4 py-3">Action</th>
                <th className="text-left px-4 py-3">Entity</th>
                <th className="text-left px-4 py-3">Metadata</th>
                <th className="text-left px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">Chưa có audit log phù hợp</td>
                </tr>
              ) : logs.map((item) => (
                <tr key={item.id} className="odd:bg-gray-50/50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(item.createdAtUtc)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{item.userName || '-'}</div>
                    <div className="text-xs text-gray-400">{item.userId ? `#${item.userId}` : 'system'}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-primary-700">{item.action}</td>
                  <td className="px-4 py-3 text-gray-700">{item.entityType}{item.entityId ? ` #${item.entityId}` : ''}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={item.metadata || ''}>{item.metadata || '-'}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{item.ipAddress || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
