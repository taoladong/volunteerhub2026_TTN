import React, { useEffect, useMemo, useState } from 'react';
import { dashboardApi } from '../../services/api';

const initialFilters = {
  from: '',
  to: '',
  eventId: '',
  categoryId: '',
  status: '',
};

const formatNumber = (value) => new Intl.NumberFormat('vi-VN').format(Number(value || 0));
const formatMoney = (value) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value || 0));
const formatDate = (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : '-');

const statusLabel = {
  Pending: 'Chờ duyệt',
  Approved: 'Đã duyệt',
  Rejected: 'Từ chối',
  Completed: 'Hoàn thành',
  Cancelled: 'Đã hủy',
};

const statusClass = {
  Pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  Approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
  Completed: 'bg-blue-50 text-blue-700 ring-blue-200',
  Cancelled: 'bg-slate-100 text-slate-600 ring-slate-200',
};

function StatCard({ icon, label, value, sub, tone = 'blue' }) {
  const tones = {
    blue: 'linear-gradient(135deg, #2563eb, #4f46e5)',
    green: 'linear-gradient(135deg, #059669, #0f766e)',
    amber: 'linear-gradient(135deg, #f59e0b, #ea580c)',
    violet: 'linear-gradient(135deg, #7c3aed, #c026d3)',
  };

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
        </div>
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
          style={{ background: tones[tone] || tones.blue }}
        >
          <i className={`fa-solid ${icon}`} />
        </div>
      </div>
    </div>
  );
}

function ProgressRow({ label, value, max, color = '#2563eb' }) {
  const percent = max > 0 ? Math.min(100, Math.round((value * 100) / max)) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-semibold text-slate-950">{formatNumber(value)}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function EmptyPanel({ title, message }) {
  return (
    <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <i className="fa-solid fa-chart-simple" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-950">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{message}</p>
    </div>
  );
}

export default function OrganizerInsights() {
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const params = Object.fromEntries(Object.entries(appliedFilters).filter(([, value]) => value !== ''));
        const response = await dashboardApi.getOrganizerInsights(params);

        if (mounted) {
          setData(response.data);
        }
      } catch (err) {
        if (mounted) {
          setError(err?.response?.data?.message || 'Không tải được dữ liệu báo cáo.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [appliedFilters]);

  const totals = data?.totals || {};
  const funnel = data?.funnel || {};
  const maxFunnel = Math.max(funnel.registrations || 0, 1);

  const activeFilterCount = useMemo(
    () => Object.values(appliedFilters).filter((value) => value !== '').length,
    [appliedFilters]
  );

  const handleChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const resetFilters = () => {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
  };

  const exportCsv = () => {
    const rows = [
      ['Chỉ số', 'Giá trị'],
      ['Sự kiện', totals.events || 0],
      ['Lượt đăng ký', totals.registrations || 0],
      ['Volunteer đã xác nhận', totals.confirmedRegistrations || 0],
      ['Volunteer đã điểm danh', totals.attendedVolunteers || 0],
      ['Giờ tình nguyện', totals.volunteerHours || 0],
      ['Chứng chỉ đã cấp', totals.certificatesIssued || 0],
      ['Ủng hộ cá nhân đã xác nhận', totals.donationConfirmedAmount || 0],
      ['Tài trợ doanh nghiệp đã nhận', totals.sponsorshipReceivedAmount || 0],
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `organizer-insights-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Organizer Insights</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">Báo cáo tác động sự kiện</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Theo dõi hiệu quả tuyển volunteer, điểm danh, chứng chỉ và nguồn lực tài chính theo từng sự kiện.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition"
            style={{ background: '#0f172a' }}
          >
            <i className="fa-solid fa-file-export" />
            Xuất CSV
          </button>
        </div>
      </div>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase text-slate-500">Từ ngày</span>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => handleChange('from', e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase text-slate-500">Đến ngày</span>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => handleChange('to', e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="space-y-1.5 xl:col-span-2">
            <span className="text-xs font-semibold uppercase text-slate-500">Sự kiện</span>
            <select
              value={filters.eventId}
              onChange={(e) => handleChange('eventId', e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Tất cả sự kiện</option>
              {(data?.filters?.events || []).map((event) => (
                <option key={event.id} value={event.id}>{event.title}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase text-slate-500">Danh mục</span>
            <select
              value={filters.categoryId}
              onChange={(e) => handleChange('categoryId', e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Tất cả</option>
              {(data?.filters?.categories || []).map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase text-slate-500">Trạng thái</span>
            <select
              value={filters.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Tất cả</option>
              {(data?.filters?.statuses || []).map((item) => (
                <option key={item} value={item}>{statusLabel[item] || item}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setAppliedFilters(filters)}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition"
            style={{ background: '#2563eb' }}
          >
            <i className="fa-solid fa-filter" />
            Áp dụng
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <i className="fa-solid fa-rotate-left" />
            Xóa lọc
          </button>
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {activeFilterCount} bộ lọc đang áp dụng
            </span>
          )}
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[360px] items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : totals.events === 0 ? (
        <EmptyPanel title="Chưa có dữ liệu phù hợp" message="Thử đổi bộ lọc hoặc tạo thêm sự kiện để xem báo cáo tác động." />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon="fa-calendar-check" label="Sự kiện theo bộ lọc" value={formatNumber(totals.events)} sub={`${formatNumber(totals.approvedEvents)} đã duyệt, ${formatNumber(totals.completedEvents)} hoàn thành`} />
            <StatCard icon="fa-users" label="Volunteer đã xác nhận" value={formatNumber(totals.confirmedRegistrations)} sub={`${formatNumber(totals.attendedVolunteers)} đã điểm danh`} tone="green" />
            <StatCard icon="fa-clock" label="Giờ tình nguyện" value={formatNumber(totals.volunteerHours)} sub={`${formatNumber(totals.certificatesIssued)} chứng chỉ đã cấp`} tone="violet" />
            <StatCard icon="fa-hand-holding-dollar" label="Nguồn lực đã xác nhận" value={formatMoney(totals.financialConfirmedAmount)} sub={`${formatMoney(totals.donationConfirmedAmount)} ủng hộ, ${formatMoney(totals.sponsorshipReceivedAmount)} tài trợ`} tone="amber" />
          </section>

          <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Phễu tham gia</h2>
                  <p className="mt-1 text-sm text-slate-500">Từ đăng ký đến chứng chỉ</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-right">
                  <p className="text-xs font-medium text-slate-500">Tỷ lệ điểm danh</p>
                  <p className="text-lg font-bold text-slate-950">{totals.attendanceRate || 0}%</p>
                </div>
              </div>
              <div className="mt-6 space-y-5">
                <ProgressRow label="Đăng ký" value={funnel.registrations || 0} max={maxFunnel} color="#334155" />
                <ProgressRow label="Được xác nhận" value={funnel.confirmed || 0} max={maxFunnel} color="#2563eb" />
                <ProgressRow label="Đã điểm danh" value={funnel.attended || 0} max={maxFunnel} color="#059669" />
                <ProgressRow label="Đã cấp chứng chỉ" value={funnel.certificates || 0} max={maxFunnel} color="#7c3aed" />
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-lg font-bold text-slate-950">Nguồn lực theo sự kiện</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
                      <th className="py-3 pr-4 font-semibold">Sự kiện</th>
                      <th className="py-3 pr-4 font-semibold">Ủng hộ</th>
                      <th className="py-3 pr-4 font-semibold">Tài trợ</th>
                      <th className="py-3 text-right font-semibold">Tổng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data?.financialByEvent || []).map((event) => (
                      <tr key={event.id}>
                        <td className="max-w-[260px] py-3 pr-4 font-medium text-slate-900">{event.title}</td>
                        <td className="py-3 pr-4 text-slate-600">{formatMoney(event.donationAmount)}</td>
                        <td className="py-3 pr-4 text-slate-600">{formatMoney(event.sponsorshipAmount)}</td>
                        <td className="py-3 text-right font-semibold text-slate-950">{formatMoney(event.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-lg font-bold text-slate-950">Sự kiện nổi bật theo điểm danh</h2>
              <div className="mt-4 space-y-3">
                {(data?.topEventsByVolunteers || []).map((event) => (
                  <div key={event.id} className="rounded-xl border border-slate-100 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{event.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatDate(event.startDate)}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClass[event.status] || 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
                        {statusLabel[event.status] || event.status}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-500">Xác nhận</p>
                        <p className="font-bold text-slate-950">{formatNumber(event.confirmed)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Điểm danh</p>
                        <p className="font-bold text-slate-950">{formatNumber(event.attended)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Tỷ lệ</p>
                        <p className="font-bold text-slate-950">{event.attendanceRate || 0}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-lg font-bold text-slate-950">Tổng quan vận hành</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-700">Theo trạng thái</p>
                  <div className="mt-4 space-y-3">
                    {(data?.statusBreakdown || []).map((item) => (
                      <div key={item.status} className="flex items-center justify-between gap-3">
                        <span className="text-sm text-slate-600">{statusLabel[item.status] || item.status}</span>
                        <span className="font-bold text-slate-950">{formatNumber(item.count)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-700">Theo danh mục</p>
                  <div className="mt-4 space-y-3">
                    {(data?.categoryBreakdown || []).map((item) => (
                      <div key={item.category} className="flex items-center justify-between gap-3">
                        <span className="text-sm text-slate-600">{item.category}</span>
                        <span className="font-bold text-slate-950">{formatNumber(item.count)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-5">
                <p className="text-sm font-semibold text-slate-700">Sự kiện tạo gần đây</p>
                <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-100">
                  {(data?.recentEvents || []).map((event) => (
                    <div key={event.id} className="flex items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">{event.title}</p>
                        <p className="text-xs text-slate-500">{event.category} · {formatDate(event.createdAt)}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClass[event.status] || 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
                        {statusLabel[event.status] || event.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
