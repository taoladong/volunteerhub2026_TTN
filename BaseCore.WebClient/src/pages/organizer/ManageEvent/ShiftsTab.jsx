import React from 'react';
import { fmt, fmtDateTime, fmtTime, toDateTimeLocal } from '../../../utils/format';
import Modal from '../../../components/ui/Modal';
import EmptyState from '../../../components/ui/EmptyState';

export default function ShiftsTab({
  event,
  id,
  shifts,
  shiftModal,
  setShiftModal,
  shiftForm,
  setShiftForm,
  shiftSaving,
  shiftError,
  onCreateShift,
  onEditShift,
  onDeleteShift,
  deletingShiftId,
}) {
  return (
    <div className="space-y-4">

      <div className="flex justify-end">
        <button onClick={() => setShiftModal(true)} className="btn-primary flex items-center gap-2">
          <i className="fa-solid fa-plus" /> Thêm ca
        </button>
      </div>

      {shifts.length === 0 ? (
        <EmptyState
          icon="fa-clock"
          title="Chưa có ca làm việc nào"
          description="Thêm ca để phân bổ tình nguyện viên theo khung giờ và tạo kênh trao đổi riêng cho mỗi ca."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {shifts.map((s) => {
            const activeCount = s.currentRegistrations ?? s.currentVolunteers ?? 0;
            return (
            <div key={s.id} className="card p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-semibold text-warmink">{s.name}</h3>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => onEditShift(s)}
                    className="p-1.5 rounded-lg text-warmink-3 hover:bg-surface-2 hover:text-warmink-2"
                    title="Sửa ca"
                  >
                    <i className="fa-solid fa-pen text-xs" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteShift(s.id)}
                    disabled={deletingShiftId === s.id}
                    className="p-1.5 rounded-lg text-warmink-3 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    title="Xóa ca"
                  >
                    {deletingShiftId === s.id
                      ? <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      : <i className="fa-solid fa-trash text-xs" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2 text-sm text-warmink-2">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-calendar w-4 text-primary-500" />
                  <span>{fmt(s.startTime)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-clock w-4 text-primary-500" />
                  <span>{fmtTime(s.startTime)} - {fmtTime(s.endTime)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-users w-4 text-primary-500" />
                  <span>{activeCount} / {s.maxVolunteers} tình nguyện viên</span>
                </div>
              </div>
              <div className="mt-3 w-full bg-surface-2 rounded-full h-1.5">
                <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (activeCount / s.maxVolunteers) * 100)}%` }} />
              </div>
            </div>
          );
          })}
        </div>
      )}

      <Modal isOpen={shiftModal} onClose={() => setShiftModal(false)} title="Thêm ca làm việc" size="md">
        <form onSubmit={onCreateShift} className="space-y-4">
          {event?.startDate && event?.endDate && (
            <div className="rounded-lg border border-primary-100 bg-primary-50 p-3 text-sm text-primary-700">
              Ca phải nằm trong thời gian sự kiện: {fmtDateTime(event.startDate)} - {fmtDateTime(event.endDate)}.
            </div>
          )}
          {shiftError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {shiftError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-warmink-2 mb-1">Tên ca *</label>
            <input type="text" value={shiftForm.name} onInput={(e) => setShiftForm((f) => ({ ...f, name: e.target.value }))} onChange={(e) => setShiftForm((f) => ({ ...f, name: e.target.value }))} required className="input-field" placeholder="VD: Ca sáng" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-warmink-2 mb-1">Bắt đầu *</label>
              <input type="datetime-local" min={toDateTimeLocal(event?.startDate)} max={toDateTimeLocal(event?.endDate)} value={shiftForm.startTime} onInput={(e) => setShiftForm((f) => ({ ...f, startTime: e.target.value }))} onChange={(e) => setShiftForm((f) => ({ ...f, startTime: e.target.value }))} required className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-warmink-2 mb-1">Kết thúc *</label>
              <input type="datetime-local" min={shiftForm.startTime || toDateTimeLocal(event?.startDate)} max={toDateTimeLocal(event?.endDate)} value={shiftForm.endTime} onInput={(e) => setShiftForm((f) => ({ ...f, endTime: e.target.value }))} onChange={(e) => setShiftForm((f) => ({ ...f, endTime: e.target.value }))} required className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-warmink-2 mb-1">Số lượng tối đa *</label>
            <input type="number" min={1} value={shiftForm.maxVolunteers} onInput={(e) => setShiftForm((f) => ({ ...f, maxVolunteers: e.target.value }))} onChange={(e) => setShiftForm((f) => ({ ...f, maxVolunteers: e.target.value }))} required className="input-field" />
          </div>
          <label className="flex items-start gap-3 rounded-lg border border-primary-100 bg-primary-50/60 p-3">
            <input
              type="checkbox"
              checked={Boolean(shiftForm.createChannel)}
              onChange={(e) => setShiftForm((f) => ({ ...f, createChannel: e.target.checked }))}
              className="mt-1 h-4 w-4 rounded border-warmborder-2 text-primary-600 focus:ring-primary-500"
            />
            <span>
              <span className="block text-sm font-semibold text-warmink">Tạo kênh riêng cho ca này</span>
              <span className="block text-xs text-warmink-2">Volunteer được xác nhận trong ca sẽ có không gian trao đổi riêng, tách khỏi kênh chung của sự kiện.</span>
            </span>
          </label>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShiftModal(false)} className="btn-secondary">Hủy</button>
            <button type="submit" disabled={shiftSaving} className="btn-primary flex items-center gap-2">
              {shiftSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Tạo ca
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
