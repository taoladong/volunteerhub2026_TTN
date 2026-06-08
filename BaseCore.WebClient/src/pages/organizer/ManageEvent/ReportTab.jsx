import React from 'react';
import { fmtTime, money } from '../../../utils/format';
import { translateAction } from './helpers.jsx';

export default function ReportTab({
  registrations,
  shifts,
  campaigns,
  proposals,
  history,
  // Computed values
  pending,
  confirmed,
  cancelled,
  attended,
  totalHours,
  fillRate,
  attendanceRate,
  financialReceived,
  financialTarget,
  financialProgress,
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Tổng đăng ký', value: registrations.length, icon: 'fa-clipboard-list' },
          { label: 'Tỷ lệ lấp đầy', value: `${fillRate}%`, icon: 'fa-chart-pie' },
          { label: 'Tỷ lệ điểm danh (/ đã xác nhận)', value: `${attendanceRate}%`, icon: 'fa-user-check' },
          { label: 'Tổng giờ ghi nhận', value: `${totalHours}h`, icon: 'fa-clock' },
        ].map((item) => (
          <div key={item.label} className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
                <i className={`fa-solid ${item.icon}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-warmink">{item.value}</p>
                <p className="text-xs text-warmink-2">{item.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-warmink mb-4">Phân bổ trạng thái đăng ký</h3>
        <div className="space-y-3">
          {[
            { label: 'Chờ xác nhận', value: pending.length, color: 'bg-yellow-500' },
            { label: 'Đã xác nhận', value: confirmed.length, color: 'bg-green-500' },
            { label: 'Đã hủy', value: cancelled.length, color: 'bg-red-500' },
            { label: 'Đã điểm danh', value: attended.length, color: 'bg-primary-500' },
          ].map((row) => {
            const pct = registrations.length > 0 ? Math.round((row.value / registrations.length) * 100) : 0;
            return (
              <div key={row.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-warmink-2">{row.label}</span>
                  <span className="font-medium text-warmink">{row.value} ({pct}%)</span>
                </div>
                <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                  <div className={`h-full ${row.color}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-warmink">Tiến độ tài chính</h3>
            <p className="mt-1 text-sm text-warmink-2">Tính từ ủng hộ cá nhân đã xác nhận và tài trợ doanh nghiệp đã nhận.</p>
          </div>
          <p className="text-2xl font-bold text-green-700">{financialProgress}%</p>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-green-500" style={{ width: `${financialProgress}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-warmink-2">
          <span>Đã ghi nhận: {money(financialReceived)}</span>
          <span>Mục tiêu/đề xuất: {money(financialTarget)}</span>
        </div>
      </div>

      {shifts.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-warmink mb-4">Báo cáo theo ca</h3>
          <div className="space-y-2">
            {shifts.map((shift) => {
              const regsInShift = registrations.filter((r) => r.shift?.id === shift.id || r.shiftId === shift.id);
              const attendedInShift = regsInShift.filter((r) => r.isAttended);
              const shiftPct = shift.maxVolunteers > 0 ? Math.round((regsInShift.length / shift.maxVolunteers) * 100) : 0;
              return (
                <div key={shift.id} className="rounded-lg border border-warmborder p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-warmink">{shift.name}</p>
                      <p className="text-xs text-warmink-2">{fmtTime(shift.startTime)} - {fmtTime(shift.endTime)}</p>
                    </div>
                    <div className="text-right text-xs text-warmink-2">
                      <p>{regsInShift.length}/{shift.maxVolunteers} đăng ký</p>
                      <p>{attendedInShift.length} điểm danh</p>
                    </div>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-surface-2 overflow-hidden">
                    <div className="h-full bg-primary-500" style={{ width: `${Math.min(shiftPct, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lịch sử thao tác */}
      <div className="card p-5">
        <h3 className="font-semibold text-warmink mb-3">Lịch sử thao tác</h3>
        {history.length === 0 ? (
          <p className="text-sm text-warmink-3">Chưa có lịch sử.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {history.map((h) => (
              <div key={h.id} className="flex items-start gap-3 text-sm border-l-2 border-warmborder pl-3 py-1">
                <span className="text-xs text-warmink-3 w-28 flex-shrink-0">{new Date(h.createdAtUtc).toLocaleString('vi-VN')}</span>
                <span className="font-medium text-warmink-2">{h.actorName || 'Hệ thống'}</span>
                <span className="text-warmink-2">{translateAction(h.action)}</span>
                {h.metadata && h.metadata.includes('Reason=') && (
                  <span className="text-xs text-red-500 ml-1">({h.metadata.split('Reason=')[1]})</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}