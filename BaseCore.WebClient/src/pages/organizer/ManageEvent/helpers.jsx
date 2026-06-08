import React from 'react';

export function translateAction(action) {
  const map = {
    'Event.Create': 'tạo sự kiện',
    'Event.Update': 'cập nhật sự kiện',
    'Event.Approve': 'duyệt sự kiện',
    'Event.Reject': 'từ chối sự kiện',
    'Event.Complete': 'hoàn thành sự kiện',
    'Event.Cancel': 'hủy sự kiện',
    'Event.Resubmit': 'gửi duyệt lại',
    'Event.Uncomplete': 'mở lại sự kiện',
    'Event.Transfer': 'chuyển quyền sở hữu',
    'Event.Delete': 'xóa sự kiện',
    'Registration.Register': 'có volunteer đăng ký',
    'Registration.Confirm': 'xác nhận volunteer',
    'Registration.Cancel': 'hủy đăng ký volunteer',
    'Registration.CheckIn': 'điểm danh',
    'Registration.SelfCheckIn': 'volunteer tự điểm danh',
    'Registration.WalkIn': 'đăng ký tại chỗ',
    'Registration.ManualAttend': 'bổ sung điểm danh',
    'Registration.AdjustHours': 'chỉnh giờ tình nguyện',
    'Registration.Withdraw': 'volunteer rút đăng ký',
    'Registration.RequestCancel': 'volunteer xin hủy',
  };
  return map[action] || action;
}

const SKILL_VERIFY_STATUS = {
  SelfDeclared: { label: 'Tự khai', className: 'bg-surface-2 text-warmink-2 border-warmborder' },
  PendingVerification: { label: 'Chờ xác minh', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  Verified: { label: 'Đã xác minh', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Rejected: { label: 'Bị từ chối', className: 'bg-red-50 text-red-700 border-red-200' },
};

export function SkillVerifyPill({ value }) {
  const status = SKILL_VERIFY_STATUS[value || 'SelfDeclared'] || SKILL_VERIFY_STATUS.SelfDeclared;
  return <span className={`rounded-full border px-1.5 py-0.5 text-[11px] font-semibold ${status.className}`}>{status.label}</span>;
}