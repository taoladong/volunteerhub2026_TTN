import React, { useState } from 'react';
import { fmtTime } from '../../../utils/format';
import Modal from '../../../components/ui/Modal';
import { QRCodeCanvas } from 'qrcode.react';

export default function CheckInTab({
  event,
  id,
  confirmed,
  attended,
  registrations,
  shifts,
  // Walk-in props
  walkInModal,
  setWalkInModal,
  walkInForm,
  setWalkInForm,
  walkInSaving,
  volunteerSearch,
  setVolunteerSearch,
  volunteerOptions,
  onSubmitWalkIn,
  onOpenWalkIn,
  // Check-in handlers
  onGpsCheckin,
  onRotateQr,
  // Check-in state
  selectedCheckinRegId,
  setSelectedCheckinRegId,
  usingGps,
  checkinMsg,
  qrModal,
  setQrModal,
  qrRotating,
}) {
  const [showAllAttended, setShowAllAttended] = useState(false);
  const checkinParts = checkinMsg.split(':');
  const checkinType = checkinParts[0];
  const checkinText = checkinParts.slice(1).join(':');

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="card p-6 space-y-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <i className="fa-solid fa-qrcode text-primary-600 text-2xl" />
          </div>
          <h2 className="font-semibold text-warmink">Điểm danh tình nguyện viên</h2>
          <p className="text-sm text-warmink-2 mt-1">Chọn người đã được xác nhận, rồi nhập mã QR của sự kiện để ghi nhận tham gia</p>
        </div>

        <div className="space-y-3">
          {event?.qrCode && (
            <button type="button" onClick={() => setQrModal(true)} className="btn-secondary w-full flex items-center justify-center gap-2">
              <i className="fa-solid fa-qrcode" /> Hiển thị QR cho volunteer quét
            </button>
          )}

          <select value={selectedCheckinRegId} onChange={(e) => setSelectedCheckinRegId(e.target.value)} className="input-field">
            <option value="">Chọn tình nguyện viên cần điểm danh</option>
            {confirmed.filter((r) => !r.isAttended).map((r) => (
              <option key={r.id} value={r.id}>
                {(r.user?.name || r.user?.userName || `User #${r.userId}`)}{r.shift ? ` · Ca: ${r.shift.name} (${fmtTime(r.shift.startTime)} - ${fmtTime(r.shift.endTime)})` : ' · Không có ca'}
              </option>
            ))}
          </select>

          <button type="button" onClick={onGpsCheckin} disabled={usingGps || !selectedCheckinRegId} className="btn-primary w-full flex items-center justify-center gap-2">
            {usingGps ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <i className="fa-solid fa-location-crosshairs" />}
            Điểm danh bằng GPS
          </button>

          <p className="text-xs text-center" style={{ color: 'rgba(15,15,15,0.45)' }}>
            Nếu không thể điểm danh tự động, vào tab "Danh sách đăng ký" → bấm "Ghi nhận tham gia" sau khi sự kiện kết thúc.
          </p>
        </div>

        {checkinMsg && (
          <div
            className="p-3 rounded-lg text-sm text-center font-medium flex items-center justify-center gap-2"
            style={checkinType === 'success'
              ? { background: 'rgba(21,128,61,0.08)', border: '1px solid rgba(21,128,61,0.20)', color: '#15803d' }
              : { background: 'rgba(185,28,28,0.07)', border: '1px solid rgba(185,28,28,0.18)', color: '#b91c1c' }}
          >
            <i className={`fa-solid ${checkinType === 'success' ? 'fa-check-circle' : 'fa-circle-exclamation'}`} />
            {checkinText}
          </div>
        )}

        {confirmed.filter((r) => !r.isAttended).length === 0 && (
          <p className="text-xs text-center text-warmink-2">
            Hiện không còn tình nguyện viên nào ở trạng thái đã xác nhận và chưa điểm danh.
          </p>
        )}
      </div>

      <Modal isOpen={qrModal} onClose={() => setQrModal(false)} title="QR điểm danh sự kiện" size="md">
        <div className="space-y-4 text-center">
          <div className="inline-flex rounded-2xl border border-warmborder bg-white p-4 shadow-sm">
            {event?.qrCode && (
              <QRCodeCanvas value={event.qrCode} size={240} includeMargin level="M" />
            )}
          </div>
          <p className="text-sm text-warmink-2">
            Volunteer đăng nhập tài khoản của mình, mở đăng ký sự kiện và quét mã này để tự điểm danh.
          </p>
          <button type="button" onClick={onRotateQr} disabled={qrRotating} className="btn-secondary inline-flex items-center justify-center gap-2">
            {qrRotating ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" /> : <i className="fa-solid fa-rotate" />}
            Tạo QR mới
          </button>
        </div>
      </Modal>

      <Modal isOpen={walkInModal} onClose={() => setWalkInModal(false)} title="Đăng ký tại chỗ" size="md">
        <form onSubmit={onSubmitWalkIn} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-warmink-2 mb-1">Tìm volunteer</label>
            <input
              value={volunteerSearch}
              onChange={(e) => setVolunteerSearch(e.target.value)}
              className="input-field"
              placeholder="Nhập tên, username hoặc email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-warmink-2 mb-1">Volunteer *</label>
            <select
              value={walkInForm.volunteerUserId}
              onChange={(e) => setWalkInForm((prev) => ({ ...prev, volunteerUserId: e.target.value }))}
              className="input-field"
              required
            >
              <option value="">-- Chọn volunteer --</option>
              {volunteerOptions.map((volunteer) => (
                <option key={volunteer.id} value={volunteer.id}>
                  {(volunteer.name || volunteer.userName)}{volunteer.profile?.kycStatus === 'Verified' ? ' · KYC' : ''}
                </option>
              ))}
            </select>
          </div>
          {shifts.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-warmink-2 mb-1">Ca làm việc *</label>
              <select
                value={walkInForm.shiftId}
                onChange={(e) => setWalkInForm((prev) => ({ ...prev, shiftId: e.target.value }))}
                className="input-field"
                required
              >
                <option value="">-- Chọn ca --</option>
                {shifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {shift.title || shift.name || `Ca #${shift.id}`}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-warmink-2">Sự kiện có ca làm việc nên walk-in phải gắn với ca cụ thể để tính giờ đúng.</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-warmink-2 mb-1">Ghi chú</label>
            <textarea
              rows={3}
              value={walkInForm.note}
              onChange={(e) => setWalkInForm((prev) => ({ ...prev, note: e.target.value }))}
              className="input-field resize-none"
              placeholder="Ví dụ: volunteer đến trực tiếp tại điểm tập trung"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setWalkInModal(false)} className="btn-secondary">Hủy</button>
            <button type="submit" disabled={walkInSaving} className="btn-primary flex items-center gap-2">
              {walkInSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Xác nhận walk-in
            </button>
          </div>
        </form>
      </Modal>

      {attended.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-warmink-2 uppercase tracking-wider mb-3">Đã điểm danh ({attended.length})</h3>
          <div className="space-y-2">
            {(showAllAttended ? attended : attended.slice(0, 10)).map((r) => (
              <div key={r.id} className="card p-3 flex items-center gap-3">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <i className="fa-solid fa-check text-primary-600 text-xs" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-warmink truncate">{r.user?.name || r.user?.userName || `User #${r.userId}`}</p>
                  {r.shift?.name && <p className="text-xs text-primary-600 mt-0.5">Ca: {r.shift.name}</p>}
                </div>
                <span className="text-xs text-primary-600 font-medium">{r.volunteerHours}h</span>
              </div>
            ))}
          </div>
          {attended.length > 10 && (
            <button
              type="button"
              onClick={() => setShowAllAttended((v) => !v)}
              className="mt-3 w-full text-sm text-primary-600 hover:text-primary-700 font-medium py-2"
            >
              {showAllAttended ? 'Thu gọn' : `Xem thêm ${attended.length - 10} người`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}