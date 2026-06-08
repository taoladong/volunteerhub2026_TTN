import React, { useEffect, useMemo, useState } from 'react';
import { dashboardApi } from '../../services/api';
import EmptyState from '../../components/ui/EmptyState';

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

const STATUS_STYLE = {
  Pending: { color: '#b45309', bg: 'rgba(180,83,9,0.08)', border: 'rgba(180,83,9,0.20)' },
  Approved: { color: '#15803d', bg: 'rgba(21,128,61,0.08)', border: 'rgba(21,128,61,0.20)' },
  Rejected: { color: '#b91c1c', bg: 'rgba(185,28,28,0.07)', border: 'rgba(185,28,28,0.18)' },
  Completed: { color: '#1b61c9', bg: 'rgba(27,97,201,0.08)', border: 'rgba(27,97,201,0.20)' },
  Cancelled: { color: 'rgba(15,15,15,0.55)', bg: 'rgba(15,15,15,0.05)', border: 'rgba(15,15,15,0.12)' },
};

function StatusPill({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.Cancelled;
  return (
    <span
      className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}
    >
      {statusLabel[status] || status}
    </span>
  );
}

function StatCard({ icon, label, value, sub, accentColor = '#1b61c9' }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid var(--c-border)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: `${accentColor}1f`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className={`fa-solid ${icon}`} style={{ color: accentColor, fontSize: 14 }} />
        </div>
        <div>
          <p style={{ fontSize: 12, color: 'rgba(15,15,15,0.50)', marginBottom: 4 }}>{label}</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-ink)', lineHeight: 1.1 }}>{value}</p>
          {sub && <p style={{ fontSize: 11, color: 'rgba(15,15,15,0.40)', marginTop: 3 }}>{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function ProgressRow({ label, value, max, color = '#1b61c9' }) {
  const percent = max > 0 ? Math.min(100, Math.round((value * 100) / max)) : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
        <span style={{ fontWeight: 500, color: 'var(--c-ink)' }}>{label}</span>
        <span style={{ fontWeight: 600, color: 'var(--c-ink)' }}>{formatNumber(value)}</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: 'var(--c-surface-2)', overflow: 'hidden' }}>
        <div style={{ width: `${percent}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.4s' }} />
      </div>
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
          <p style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1b61c9' }}>Organizer Insights</p>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--c-ink)', marginTop: 4 }}>Báo cáo tác động sự kiện</h1>
          <p style={{ fontSize: 13, color: 'rgba(15,15,15,0.50)', marginTop: 8, maxWidth: '48rem' }}>
            Theo dõi hiệu quả tuyển volunteer, điểm danh, chứng chỉ và nguồn lực tài chính theo từng sự kiện.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition"
            style={{ background: 'var(--c-ink)' }}
          >
            <i className="fa-solid fa-file-export" />
            Xuất CSV
          </button>
        </div>
      </div>

      <section className="rounded-xl bg-white p-4 sm:p-5" style={{ border: '1px solid var(--c-border)' }}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="space-y-1.5">
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'rgba(15,15,15,0.55)' }}>Từ ngày</span>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => handleChange('from', e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none transition"
              style={{ border: '1px solid rgba(15,15,15,0.12)', color: 'var(--c-ink)' }}
            />
          </label>
          <label className="space-y-1.5">
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'rgba(15,15,15,0.55)' }}>Đến ngày</span>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => handleChange('to', e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none transition"
              style={{ border: '1px solid rgba(15,15,15,0.12)', color: 'var(--c-ink)' }}
            />
          </label>
          <label className="space-y-1.5 xl:col-span-2">
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'rgba(15,15,15,0.55)' }}>Sự kiện</span>
            <select
              value={filters.eventId}
              onChange={(e) => handleChange('eventId', e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none transition"
              style={{ border: '1px solid rgba(15,15,15,0.12)', color: 'var(--c-ink)' }}
            >
              <option value="">Tất cả sự kiện</option>
              {(data?.filters?.events || []).map((event) => (
                <option key={event.id} value={event.id}>{event.title}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'rgba(15,15,15,0.55)' }}>Danh mục</span>
            <select
              value={filters.categoryId}
              onChange={(e) => handleChange('categoryId', e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none transition"
              style={{ border: '1px solid rgba(15,15,15,0.12)', color: 'var(--c-ink)' }}
            >
              <option value="">Tất cả</option>
              {(data?.filters?.categories || []).map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'rgba(15,15,15,0.55)' }}>Trạng thái</span>
            <select
              value={filters.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none transition"
              style={{ border: '1px solid rgba(15,15,15,0.12)', color: 'var(--c-ink)' }}
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
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition"
            style={{ background: 'var(--c-ink)' }}
          >
            <i className="fa-solid fa-filter" />
            Áp dụng
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold transition"
            style={{ border: '1px solid rgba(15,15,15,0.12)', color: 'rgba(15,15,15,0.70)' }}
          >
            <i className="fa-solid fa-rotate-left" />
            Xóa lọc
          </button>
          {activeFilterCount > 0 && (
            <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: 'rgba(27,97,201,0.08)', color: '#1b61c9' }}>
              {activeFilterCount} bộ lọc đang áp dụng
            </span>
          )}
        </div>
      </section>

      {error && (
        <div className="rounded-xl p-4 text-sm font-medium" style={{ background: 'rgba(185,28,28,0.07)', border: '1px solid rgba(185,28,28,0.18)', color: '#b91c1c' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[360px] items-center justify-center rounded-xl bg-white" style={{ border: '1px solid var(--c-border)' }}>
          <div className="h-10 w-10 animate-spin rounded-full" style={{ border: '4px solid rgba(27,97,201,0.20)', borderTopColor: '#1b61c9' }} />
        </div>
      ) : totals.events === 0 ? (
        <EmptyState icon="fa-chart-simple" title="Chưa có dữ liệu phù hợp" description="Thử đổi bộ lọc hoặc tạo thêm sự kiện để xem báo cáo tác động." />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon="fa-calendar-check" label="Sự kiện theo bộ lọc" value={formatNumber(totals.events)} sub={`${formatNumber(totals.approvedEvents)} đã duyệt, ${formatNumber(totals.completedEvents)} hoàn thành`} accentColor="#1b61c9" />
            <StatCard icon="fa-users" label="Volunteer đã xác nhận" value={formatNumber(totals.confirmedRegistrations)} sub={`${formatNumber(totals.attendedVolunteers)} đã điểm danh`} accentColor="#15803d" />
            <StatCard icon="fa-clock" label="Giờ tình nguyện" value={formatNumber(totals.volunteerHours)} sub={`${formatNumber(totals.certificatesIssued)} chứng chỉ đã cấp`} accentColor="#f0612f" />
            <StatCard icon="fa-hand-holding-dollar" label="Nguồn lực đã xác nhận" value={formatMoney(totals.financialConfirmedAmount)} sub={`${formatMoney(totals.donationConfirmedAmount)} ủng hộ, ${formatMoney(totals.sponsorshipReceivedAmount)} tài trợ`} accentColor="#b45309" />
          </section>

          <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-xl bg-white p-5" style={{ border: '1px solid var(--c-border)' }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--c-ink)' }}>Phễu tham gia</h2>
                  <p style={{ fontSize: 13, color: 'rgba(15,15,15,0.50)', marginTop: 2 }}>Từ đăng ký đến chứng chỉ</p>
                </div>
                <div className="rounded-lg px-3 py-2 text-right" style={{ background: 'rgba(15,15,15,0.03)' }}>
                  <p style={{ fontSize: 11, color: 'rgba(15,15,15,0.50)' }}>Điểm danh / Đã xác nhận</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--c-ink)' }}>{totals.attendanceRate || 0}%</p>
                </div>
              </div>
              <div className="mt-6 space-y-5">
                <ProgressRow label="Đăng ký" value={funnel.registrations || 0} max={maxFunnel} color="rgba(15,15,15,0.45)" />
                <ProgressRow label="Được xác nhận" value={funnel.confirmed || 0} max={maxFunnel} color="#1b61c9" />
                <ProgressRow label="Đã điểm danh" value={funnel.attended || 0} max={maxFunnel} color="#15803d" />
                <ProgressRow label="Đã cấp chứng chỉ" value={funnel.certificates || 0} max={maxFunnel} color="#f0612f" />
              </div>
            </div>

            <div className="rounded-xl bg-white p-5" style={{ border: '1px solid var(--c-border)' }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--c-ink)' }}>Nguồn lực theo sự kiện</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--c-border)' }}>
                      <th className="py-3 pr-4" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(15,15,15,0.55)' }}>Sự kiện</th>
                      <th className="py-3 pr-4" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(15,15,15,0.55)' }}>Ủng hộ</th>
                      <th className="py-3 pr-4" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(15,15,15,0.55)' }}>Tài trợ</th>
                      <th className="py-3 text-right" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(15,15,15,0.55)' }}>Tổng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.financialByEvent || []).map((event) => (
                      <tr key={event.id} style={{ borderBottom: '1px solid rgba(15,15,15,0.05)' }}>
                        <td className="max-w-[260px] py-3 pr-4" style={{ fontWeight: 500, color: 'var(--c-ink)' }}>{event.title}</td>
                        <td className="py-3 pr-4" style={{ color: 'rgba(15,15,15,0.60)' }}>{formatMoney(event.donationAmount)}</td>
                        <td className="py-3 pr-4" style={{ color: 'rgba(15,15,15,0.60)' }}>{formatMoney(event.sponsorshipAmount)}</td>
                        <td className="py-3 text-right" style={{ fontWeight: 600, color: 'var(--c-ink)' }}>{formatMoney(event.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <div className="rounded-xl bg-white p-5" style={{ border: '1px solid var(--c-border)' }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--c-ink)' }}>Sự kiện nổi bật theo điểm danh</h2>
              <div className="mt-4 space-y-3">
                {(data?.topEventsByVolunteers || []).map((event) => (
                  <div key={event.id} className="rounded-lg p-4" style={{ border: '1px solid var(--c-border)' }}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p style={{ fontWeight: 600, color: 'var(--c-ink)' }}>{event.title}</p>
                        <p style={{ fontSize: 11, color: 'rgba(15,15,15,0.50)', marginTop: 4 }}>{formatDate(event.startDate)}</p>
                      </div>
                      <StatusPill status={event.status} />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p style={{ fontSize: 11, color: 'rgba(15,15,15,0.50)' }}>Xác nhận</p>
                        <p style={{ fontWeight: 700, color: 'var(--c-ink)' }}>{formatNumber(event.confirmed)}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 11, color: 'rgba(15,15,15,0.50)' }}>Điểm danh</p>
                        <p style={{ fontWeight: 700, color: 'var(--c-ink)' }}>{formatNumber(event.attended)}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 11, color: 'rgba(15,15,15,0.50)' }}>Tỷ lệ</p>
                        <p style={{ fontWeight: 700, color: 'var(--c-ink)' }}>{event.attendanceRate || 0}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-white p-5" style={{ border: '1px solid var(--c-border)' }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--c-ink)' }}>Tổng quan vận hành</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-lg p-4" style={{ background: 'rgba(15,15,15,0.03)' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-ink)' }}>Theo trạng thái</p>
                  <div className="mt-4 space-y-3">
                    {(data?.statusBreakdown || []).map((item) => (
                      <div key={item.status} className="flex items-center justify-between gap-3">
                        <span style={{ fontSize: 13, color: 'rgba(15,15,15,0.60)' }}>{statusLabel[item.status] || item.status}</span>
                        <span style={{ fontWeight: 700, color: 'var(--c-ink)' }}>{formatNumber(item.count)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg p-4" style={{ background: 'rgba(15,15,15,0.03)' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-ink)' }}>Theo danh mục</p>
                  <div className="mt-4 space-y-3">
                    {(data?.categoryBreakdown || []).map((item) => (
                      <div key={item.category} className="flex items-center justify-between gap-3">
                        <span style={{ fontSize: 13, color: 'rgba(15,15,15,0.60)' }}>{item.category}</span>
                        <span style={{ fontWeight: 700, color: 'var(--c-ink)' }}>{formatNumber(item.count)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-5">
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-ink)' }}>Sự kiện tạo gần đây</p>
                <div className="mt-3 rounded-lg" style={{ border: '1px solid var(--c-border)' }}>
                  {(data?.recentEvents || []).map((event, idx) => (
                    <div key={event.id} className="flex items-center justify-between gap-3 p-3" style={idx > 0 ? { borderTop: '1px solid rgba(15,15,15,0.05)' } : undefined}>
                      <div className="min-w-0">
                        <p className="truncate" style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-ink)' }}>{event.title}</p>
                        <p style={{ fontSize: 11, color: 'rgba(15,15,15,0.50)' }}>{event.category} · {formatDate(event.createdAt)}</p>
                      </div>
                      <StatusPill status={event.status} />
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
