import React, { useEffect, useState } from 'react';
import { fmt, fmtDateTime } from '../../../utils/format';
import StatusBadge from '../../../components/ui/StatusBadge';
import EmptyState from '../../../components/ui/EmptyState';
import { SkillVerifyPill } from './helpers.jsx';

const TH_STYLE = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(15,15,15,0.55)', background: 'rgba(15,15,15,0.03)' };

const PAGE_SIZE = 20;

export default function RegistrationsTab({
  registrations,
  shifts,
  event,
  ratingForms,
  setRatingForms,
  manualHours,
  setManualHours,
  hoursSaving,
  onConfirm,
  onCancel,
  onApproveCancelRequest,
  onManualAttend,
  onCheckOut,
  onSaveAdjustedHours,
  onSubmitRating,
  onEditRating,
  onCancelEditRating,
  onOpenWalkIn,
  onOpenChangeShift,
  onScheduleInterview,
  onCancelInterview,
  onDecideInterview,
  onOpenInterviewCall,
  onRecordAllAttended,
}) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(registrations.length / PAGE_SIZE);
  // Kẹp trang về cuối khi danh sách co lại (vd sau khi hủy nhiều) để không hiện bảng trắng.
  useEffect(() => {
    if (page > 0 && page >= totalPages) setPage(Math.max(0, totalPages - 1));
  }, [totalPages, page]);
  const paged = registrations.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const confirmedNotAttended = registrations.filter((r) => r.status === 'Confirmed' && !r.isAttended);
  const pendingCount = registrations.filter((r) => r.status === 'Pending').length;
  const attendedCount = registrations.filter((r) => r.isAttended).length;
  const eventEnded = event?.endDate && new Date(event.endDate) <= new Date();
  const isClosed = event?.status === 'Completed' || event?.status === 'Cancelled';

  return (
    <div className="space-y-3">
      {shifts.length > 0 && registrations.some((r) => r.status !== 'Cancelled' && !r.shiftId) && (
        <div className="rounded-lg p-3 text-sm" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.20)', color: '#b45309' }}>
          <p className="font-semibold flex items-center gap-2">
            <i className="fa-solid fa-triangle-exclamation" />
            Có {registrations.filter((r) => r.status !== 'Cancelled' && !r.shiftId).length} đăng ký chưa chọn ca cụ thể
          </p>
          <p className="mt-1">
            Sự kiện đã có ca làm việc. Bạn nên liên hệ những volunteer này để gán họ vào ca, hoặc xác định trước họ làm cả ngày.
          </p>
        </div>
      )}

      {/* Thanh hướng dẫn theo bước (tự đổi theo trạng thái sự kiện) */}
      {(() => {
        let icon = 'fa-circle-info';
        let title = 'Ghi nhận tình nguyện viên tham gia';
        let desc = 'Sau sự kiện, ghi nhận người đã tham gia — thủ công (kể cả khi bạn quản lý ngoài hệ thống) hoặc tự động qua điểm danh QR/GPS.';
        let tone = 'rgba(15,15,15,0.40)';
        let primary = null;

        if (!isClosed && !eventEnded && pendingCount > 0) {
          icon = 'fa-user-plus'; tone = '#b45309';
          title = `${pendingCount} đăng ký đang chờ bạn duyệt`;
          desc = 'Bấm “Chấp nhận” ở từng dòng để nhận tình nguyện viên. Bạn chưa cần điểm danh hay chia ca.';
        } else if (!isClosed && eventEnded && confirmedNotAttended.length > 0) {
          icon = 'fa-user-check'; tone = '#1b61c9';
          title = `${confirmedNotAttended.length} người đã nhận nhưng chưa ghi nhận tham gia`;
          desc = 'Ghi nhận người đã hoàn thành rồi bấm “Hoàn thành” ở đầu trang để cộng giờ & cấp chứng chỉ.';
          primary = (
            <button type="button" onClick={() => onRecordAllAttended && onRecordAllAttended()} className="btn-primary btn-sm flex items-center gap-2 whitespace-nowrap">
              <i className="fa-solid fa-user-check" /> Ghi nhận tất cả đã tham gia ({confirmedNotAttended.length})
            </button>
          );
        } else if (!isClosed && eventEnded && attendedCount > 0) {
          icon = 'fa-flag-checkered'; tone = '#15803d';
          title = `Đã ghi nhận ${attendedCount} người tham gia`;
          desc = 'Bấm “Hoàn thành” ở đầu trang để cấp chứng chỉ cho những người đã được ghi nhận.';
        } else if (isClosed) {
          icon = 'fa-flag-checkered'; tone = '#15803d';
          title = 'Sự kiện đã đóng';
          desc = `${attendedCount} người được ghi nhận tham gia.`;
        }

        return (
          <div className="rounded-lg p-3" style={{ border: '1px solid rgba(15,15,15,0.08)', background: '#fff' }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="flex items-center justify-center flex-shrink-0" style={{ width: 32, height: 32, borderRadius: 8, background: `${tone}14` }}>
                  <i className={`fa-solid ${icon}`} style={{ color: tone, fontSize: 13 }} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--c-ink)' }}>{title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(15,15,15,0.50)' }}>{desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {primary}
                {!isClosed && (
                  <button type="button" onClick={onOpenWalkIn} className="btn-secondary btn-sm flex items-center gap-2 whitespace-nowrap">
                    <i className="fa-solid fa-person-walking" /> Đăng ký tại chỗ
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {registrations.length === 0 ? (
        <EmptyState
          icon="fa-users"
          title="Chưa có tình nguyện viên nào đăng ký"
          description="Khi có người đăng ký tham gia, họ sẽ xuất hiện ở đây để bạn xác nhận và điểm danh."
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-[760px] w-full text-sm">
            <thead>
              <tr style={TH_STYLE}>
                <th className="text-left px-4 py-3">Tình nguyện viên</th>
                <th className="text-left px-4 py-3">Ngày đăng ký</th>
                <th className="text-left px-4 py-3">Trạng thái</th>
                <th className="text-left px-4 py-3">Tham gia</th>
                <th className="text-left px-4 py-3">Giờ ghi nhận</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warmborder">
              {paged.map((r) => (
                <tr key={r.id} className="odd:bg-surface-2/50 hover:bg-surface-2">
                  <td className="px-4 py-3">
                    <div className="font-medium text-warmink">{r.user?.name || r.user?.userName || `User #${r.userId}`}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <a href={`/profile/${r.userId}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline">Xem hồ sơ</a>
                      {r.cancelRequested && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">Xin hủy{r.cancelReason ? `: ${r.cancelReason}` : ''}</span>}
                    </div>
                    {r.note && <p className="text-xs text-warmink-3 italic mt-0.5">"{r.note}"</p>}
                    {r.shift?.name && <p className="text-xs text-primary-600 mt-0.5">Ca: {r.shift.name}</p>}
                    {r.interviewSlot && r.interviewStatus === 'Scheduled' && (
                      <div className="mt-2 inline-flex items-center gap-2 rounded-lg px-2.5 py-1 text-xs" style={{ background: 'rgba(27,97,201,0.06)', border: '1px solid rgba(27,97,201,0.18)', color: '#1b61c9' }}>
                        <i className="fa-solid fa-video" />
                        <span>Phỏng vấn: {fmtDateTime(r.interviewSlot.scheduledAt)}</span>
                        <button type="button" onClick={() => onOpenInterviewCall && onOpenInterviewCall(r.interviewSlot)} className="font-medium underline" style={{ color: '#1b61c9' }}>Gọi video</button>
                        {r.interviewSlot.meetingUrl && (
                          <a href={r.interviewSlot.meetingUrl} target="_blank" rel="noreferrer" className="font-medium underline" style={{ color: '#1b61c9' }}>Mở phòng</a>
                        )}
                      </div>
                    )}
                    {r.interviewStatus === 'Passed' && (
                      <p className="text-xs mt-1" style={{ color: '#15803d' }}><i className="fa-solid fa-circle-check mr-1" />Đã đạt phỏng vấn</p>
                    )}
                    {(r.interviewStatus === 'Failed' || r.interviewStatus === 'NoShow') && (
                      <p className="text-xs mt-1" style={{ color: '#b91c1c' }}><i className="fa-solid fa-circle-xmark mr-1" />{r.interviewStatus === 'NoShow' ? 'Vắng mặt phỏng vấn' : 'Không đạt phỏng vấn'}</p>
                    )}
                    {r.volunteerSkills?.length > 0 && (
                      <div className="mt-2 flex max-w-md flex-wrap gap-1.5">
                        {r.volunteerSkills.map((skill) => (
                          <span key={`${r.id}-${skill.skillId}`} className="inline-flex items-center gap-1 rounded-full border border-warmborder bg-white px-2 py-0.5 text-xs text-warmink-2">
                            <span className="font-medium">{skill.skillName || `Skill #${skill.skillId}`}</span>
                            <SkillVerifyPill value={skill.verificationStatus} />
                          </span>
                        ))}
                      </div>
                    )}
                    {r.cancelRequested && r.status !== 'Cancelled' && (
                      <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                        <i className="fa-solid fa-hourglass-half" /> Đang chờ hủy
                      </div>
                    )}
                    {r.cancelRequested && r.cancelReason && r.status !== 'Cancelled' && (
                      <p className="text-xs text-amber-700 mt-1">Lý do: {r.cancelReason}</p>
                    )}
                    {r.isAttended && event?.status === 'Completed' && (() => {
                      const isEditing = ratingForms[r.id]?.editing;
                      const alreadyRated = (r.hasRated || ratingForms[r.id]?.done) && !isEditing;
                      return (
                        <div className="mt-2 rounded-lg border border-warmborder bg-surface-2 p-2">
                          {alreadyRated ? (
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs text-green-700 flex-1">
                                <i className="fa-solid fa-circle-check mr-1" />
                                Đã đánh giá {r.ratingScore ? `(${r.ratingScore} sao)` : ''}
                                {r.ratingComment ? ` — "${r.ratingComment}"` : ''}
                              </p>
                              <button
                                type="button"
                                onClick={() => onEditRating && onEditRating(r)}
                                className="text-xs font-medium flex-shrink-0"
                                style={{ color: '#1b61c9' }}
                              >
                                <i className="fa-solid fa-pen text-[10px] mr-1" />Sửa
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1 sm:flex-row">
                              <select
                                value={ratingForms[r.id]?.score || 5}
                                onChange={(e) => setRatingForms((prev) => ({ ...prev, [r.id]: { ...(prev[r.id] || {}), score: e.target.value } }))}
                                className="input-field text-xs sm:w-24"
                              >
                                {[5, 4, 3, 2, 1].map((score) => <option key={score} value={score}>{score} sao</option>)}
                              </select>
                              <input
                                value={ratingForms[r.id]?.comment || ''}
                                onChange={(e) => setRatingForms((prev) => ({ ...prev, [r.id]: { ...(prev[r.id] || {}), comment: e.target.value } }))}
                                className="input-field text-xs"
                                placeholder="Nhận xét..."
                              />
                              <button onClick={() => onSubmitRating(r)} className="btn-primary btn-sm text-xs">
                                {isEditing ? 'Lưu' : 'Đánh giá'}
                              </button>
                              {isEditing && (
                                <button onClick={() => onCancelEditRating && onCancelEditRating(r)} className="btn-secondary btn-sm text-xs">
                                  Hủy
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-warmink-2">{fmt(r.registeredAt)}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3">
                    {r.isAttended ? (
                      <span className="text-xs bg-primary-50 text-primary-600 border border-primary-100 px-2 py-0.5 rounded-full font-medium">✓ {r.volunteerHours}h</span>
                    ) : (
                      <span className="text-xs text-warmink-3">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.isAttended ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {!r.checkedOutAt && (
                          <button
                            type="button"
                            onClick={() => onCheckOut(r)}
                            disabled={!!hoursSaving[`checkout-${r.id}`]}
                            className="btn-primary btn-sm text-xs"
                          >
                            {hoursSaving[`checkout-${r.id}`] ? 'Đang lưu...' : 'Check-out'}
                          </button>
                        )}
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={manualHours[r.id] ?? r.volunteerHours ?? 0}
                          onChange={(e) => setManualHours((prev) => ({ ...prev, [r.id]: e.target.value }))}
                          className="input-field w-24"
                        />
                        <button
                          type="button"
                          onClick={() => onSaveAdjustedHours(r)}
                          disabled={!!hoursSaving[`hours-${r.id}`]}
                          className="btn-secondary btn-sm text-xs"
                        >
                          {hoursSaving[`hours-${r.id}`] ? 'Đang lưu...' : 'Lưu'}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-warmink-3">Chưa có</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 justify-end">
                      {r.status === 'Pending' && r.interviewStatus === 'Scheduled' && (
                        <>
                          <button onClick={() => onDecideInterview && onDecideInterview(r, 'Passed')} className="btn-primary btn-sm text-xs">
                            <i className="fa-solid fa-check mr-1" /> Đạt
                          </button>
                          <button onClick={() => onDecideInterview && onDecideInterview(r, 'Failed')} className="btn-danger btn-sm text-xs">
                            <i className="fa-solid fa-xmark mr-1" /> Không đạt
                          </button>
                          <button onClick={() => onScheduleInterview && onScheduleInterview(r)} className="btn-secondary btn-sm text-xs">
                            <i className="fa-solid fa-clock mr-1" /> Đổi lịch
                          </button>
                          <button onClick={() => onCancelInterview && onCancelInterview(r)} className="btn-secondary btn-sm text-xs">
                            Hủy lịch
                          </button>
                        </>
                      )}
                      {r.status === 'Pending' && r.interviewStatus !== 'Scheduled' && (
                        <>
                          <button onClick={() => onConfirm(r.id)} className="btn-primary btn-sm text-xs">
                            <i className="fa-solid fa-check mr-1" /> Chấp nhận
                          </button>
                          <button onClick={() => onScheduleInterview && onScheduleInterview(r)} className="btn-secondary btn-sm text-xs">
                            <i className="fa-solid fa-video mr-1" /> Hẹn PV
                          </button>
                          <button onClick={() => onCancel(r.id)} className="btn-danger btn-sm text-xs">
                            <i className="fa-solid fa-xmark" />
                          </button>
                        </>
                      )}
                      {r.status === 'Confirmed' && !r.isAttended && (
                        <>
                          {eventEnded && (
                            <button
                              type="button"
                              onClick={() => onManualAttend(r)}
                              disabled={!!hoursSaving[`attend-${r.id}`]}
                              className="btn-primary btn-sm text-xs"
                            >
                              <i className="fa-solid fa-user-check mr-1" />
                              {hoursSaving[`attend-${r.id}`] ? 'Đang lưu...' : 'Ghi nhận tham gia'}
                            </button>
                          )}
                          {shifts.length > 0 && onOpenChangeShift && (
                            <button
                              type="button"
                              onClick={() => onOpenChangeShift(r)}
                              className="btn-secondary btn-sm text-xs"
                            >
                              <i className="fa-solid fa-arrows-rotate mr-1" /> Chuyển ca
                            </button>
                          )}
                          {r.cancelRequested ? (
                            <button
                              type="button"
                              onClick={() => onApproveCancelRequest(r.id)}
                              className="btn-danger btn-sm text-xs"
                            >
                              <i className="fa-solid fa-check mr-1" /> Duyệt hủy
                            </button>
                          ) : (
                            <button onClick={() => onCancel(r.id)} className="btn-secondary btn-sm text-xs">
                              <i className="fa-solid fa-xmark mr-1" /> Hủy
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-warmborder px-4 py-3">
              <p className="text-xs text-warmink-2">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, registrations.length)} / {registrations.length} đăng ký
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="btn-secondary btn-sm disabled:opacity-40"
                >
                  ‹ Trước
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="btn-secondary btn-sm disabled:opacity-40"
                >
                  Sau ›
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
