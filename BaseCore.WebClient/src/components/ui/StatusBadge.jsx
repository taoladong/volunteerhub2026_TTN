import React from 'react';

const STATUS_MAP = {
  Pending: { bg: 'rgba(245,158,11,0.12)', color: '#92400e', border: 'rgba(245,158,11,0.30)', label: 'Chờ duyệt' },
  Approved: { bg: 'rgba(22,163,74,0.10)', color: '#006400', border: 'rgba(22,163,74,0.25)', label: 'Đã duyệt' },
  Completed: { bg: 'rgba(27,97,201,0.10)', color: '#1552b0', border: 'rgba(27,97,201,0.25)', label: 'Hoàn thành' },
  Cancelled: { bg: 'rgba(220,38,38,0.09)', color: '#991b1b', border: 'rgba(220,38,38,0.22)', label: 'Đã hủy' },
  Confirmed: { bg: 'rgba(22,163,74,0.10)', color: '#006400', border: 'rgba(22,163,74,0.25)', label: 'Đã xác nhận' },
  Rejected: { bg: 'rgba(220,38,38,0.09)', color: '#991b1b', border: 'rgba(220,38,38,0.22)', label: 'Từ chối' },
  // Campaign statuses
  Open: { bg: 'rgba(22,163,74,0.10)', color: '#006400', border: 'rgba(22,163,74,0.25)', label: 'Đang mở' },
  Closed: { bg: 'rgba(107,114,128,0.12)', color: '#374151', border: 'rgba(107,114,128,0.25)', label: 'Đã đóng' },
  Draft: { bg: 'rgba(107,114,128,0.10)', color: '#6b7280', border: 'rgba(107,114,128,0.22)', label: 'Nháp' },
  // Registration attendance statuses
  Attended: { bg: 'rgba(22,163,74,0.10)', color: '#006400', border: 'rgba(22,163,74,0.25)', label: 'Đã tham gia' },
  NoShow: { bg: 'rgba(220,38,38,0.09)', color: '#991b1b', border: 'rgba(220,38,38,0.22)', label: 'Vắng mặt' },
  // Sponsorship statuses
  Accepted: { bg: 'rgba(22,163,74,0.10)', color: '#006400', border: 'rgba(22,163,74,0.25)', label: 'Đã chấp nhận' },
  Proposed: { bg: 'rgba(245,158,11,0.12)', color: '#92400e', border: 'rgba(245,158,11,0.30)', label: 'Đề xuất' },
};

export default function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || {
    bg: 'rgba(4,14,32,0.07)',
    color: 'rgba(4,14,32,0.60)',
    border: 'rgba(4,14,32,0.14)',
    label: status,
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 9px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: '0.12px',
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {s.label}
    </span>
  );
}
