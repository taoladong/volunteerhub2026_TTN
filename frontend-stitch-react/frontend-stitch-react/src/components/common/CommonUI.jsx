import React, { useEffect, useState } from 'react';
import Icon from './Icon';
import { uploadApi } from '../../services/api';

export const unwrap = (res, fallback = []) => {
  const data = res?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  return data?.data ?? data ?? fallback;
};

export const getErrorMessage = (err, fallback = 'Đã xảy ra lỗi') =>
  err?.response?.data?.message || err?.response?.data?.title || err?.message || fallback;

export function Alert({ type = 'info', title, children, className = '' }) {
  const variants = {
    success: {
      icon: 'check_circle',
      wrapper: 'bg-success-container text-on-success-container border-success/20',
      iconBox: 'bg-white/70 text-success',
    },
    error: {
      icon: 'error',
      wrapper: 'bg-error-container text-error border-error/20',
      iconBox: 'bg-white/70 text-error',
    },
    warning: {
      icon: 'warning',
      wrapper: 'bg-warning-container text-amber-800 border-warning/25',
      iconBox: 'bg-white/70 text-amber-700',
    },
    info: {
      icon: 'info',
      wrapper: 'bg-primary-container text-primary border-primary/20',
      iconBox: 'bg-white/70 text-primary',
    },
  };
  const tone = variants[type] || variants.info;

  return (
    <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-sm ${tone.wrapper} ${className}`}>
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tone.iconBox}`}>
        <Icon name={tone.icon} size={20} filled />
      </span>
      <div className="min-w-0 flex-1">
        {title && <div className="text-label-md font-bold">{title}</div>}
        <div className="text-body-sm font-medium leading-6">{children}</div>
      </div>
    </div>
  );
}

export const formatDate = (value, options) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('vi-VN', options || { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const formatMoney = (value) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value || 0));

export function PageHeader({ icon, title, subtitle, actions }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-12 h-12 rounded-2xl bg-primary-container flex items-center justify-center text-primary">
              <Icon name={icon} size={28} />
            </div>
          )}
          <h1 className="text-headline-lg font-bold text-on-surface font-headline">{title}</h1>
        </div>
        {subtitle && <p className="text-on-surface-variant mt-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatusBadge({ status, children }) {
  const normalized = String(status || '').toLowerCase();
  const classes = normalized.includes('approve') || normalized.includes('verified') || normalized.includes('confirm') || normalized.includes('open') || normalized.includes('complete') || normalized.includes('active')
    ? 'bg-success-container text-on-success-container'
    : normalized.includes('reject') || normalized.includes('cancel') || normalized.includes('hide') || normalized.includes('delete')
      ? 'bg-error-container text-error'
      : normalized.includes('pending') || normalized.includes('draft') || normalized.includes('need') || normalized.includes('overdue')
        ? 'bg-warning-container text-amber-700'
        : 'bg-surface-variant text-on-surface-variant';
  return <span className={`inline-flex items-center px-3 py-1 rounded-full text-label-sm font-bold ${classes}`}>{children || status || '—'}</span>;
}

export function EmptyState({ icon = 'inbox', title = 'Chưa có dữ liệu', description, action }) {
  return (
    <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-outline">
      <div className="mx-auto w-16 h-16 rounded-3xl bg-primary-container flex items-center justify-center text-primary mb-4">
        <Icon name={icon} size={36} />
      </div>
      <h3 className="text-title-md font-bold text-on-surface">{title}</h3>
      {description && <p className="text-on-surface-variant mt-2">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function TabBar({ tabs, active, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 bg-surface-variant p-2 rounded-2xl">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={`px-4 py-2 rounded-xl text-label-md font-bold transition-all ${
            active === tab.value ? 'bg-white shadow-sm text-primary border border-outline' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function Pagination({ page = 1, pageSize = 10, total = 0, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil((Number(total) || 0) / pageSize));
  const currentPage = Math.min(Math.max(Number(page) || 1, 1), totalPages);
  const getPageItems = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    let start = Math.max(2, currentPage - 1);
    let end = Math.min(totalPages - 1, currentPage + 1);

    if (currentPage <= 3) end = 4;
    if (currentPage >= totalPages - 2) start = totalPages - 3;

    const items = [1];
    if (start > 2) items.push('ellipsis-start');
    for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
      items.push(pageNumber);
    }
    if (end < totalPages - 1) items.push('ellipsis-end');
    items.push(totalPages);

    return items;
  };

  return (
    <div className="flex justify-center mt-4">
      <div className="flex flex-wrap justify-center gap-2">
        {getPageItems().map((item) => {
          if (typeof item === 'string') {
            return (
              <span key={item} className="inline-flex h-10 min-w-10 items-center justify-center px-2 text-label-md font-bold text-on-surface-variant">
                ...
              </span>
            );
          }

          const isActive = item === currentPage;
          return (
            <button
              key={item}
              type="button"
              className={`inline-flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-label-md font-bold transition-all ${
                isActive
                  ? 'border-primary bg-primary text-on-primary shadow-sm'
                  : 'border-outline bg-white text-on-surface hover:border-primary hover:text-primary'
              }`}
              onClick={() => !isActive && onPageChange?.(item)}
              disabled={isActive}
              aria-current={isActive ? 'page' : undefined}
            >
              {item}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Tìm kiếm...', delay = 350 }) {
  const [draft, setDraft] = useState(value || '');
  useEffect(() => setDraft(value || ''), [value]);
  useEffect(() => {
    const id = setTimeout(() => onChange(draft), delay);
    return () => clearTimeout(id);
  }, [draft, delay, onChange]);
  return (
    <div className="relative">
      <Icon name="search" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
      <input className="input-field pl-10" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmText = 'Xác nhận', cancelText = 'Hủy', danger, reason, onReasonChange, onConfirm, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-soft border border-outline w-full max-w-lg p-6">
        <h3 className="text-title-lg font-bold text-on-surface">{title}</h3>
        {message && <p className="text-on-surface-variant mt-2">{message}</p>}
        {onReasonChange && (
          <textarea className="input-field mt-4 min-h-28" value={reason || ''} onChange={(e) => onReasonChange(e.target.value)} placeholder="Nhập lý do..." />
        )}
        <div className="flex justify-end gap-3 mt-6">
          <button type="button" className="btn-secondary" onClick={onClose}>{cancelText}</button>
          <button type="button" className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

export function ImageUploader({ label = 'Tải ảnh lên', value, onUpload, accept = 'image/*' }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const handleChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const res = await uploadApi.uploadImage(file);
      const url = res?.data?.url || res?.data?.data?.url || res?.data?.fileUrl || res?.data?.data || '';
      onUpload(url);
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được ảnh'));
    } finally {
      setLoading(false);
    }
  };
  return (
    <div>
      <label className="text-label-sm font-medium text-on-surface-variant mb-1 block">{label}</label>
      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <input type="file" accept={accept} onChange={handleChange} className="input-field" disabled={loading} />
        {value && <a href={value} target="_blank" rel="noreferrer" className="text-primary font-bold text-label-md">Xem file</a>}
      </div>
      {loading && <p className="text-body-sm text-on-surface-variant mt-1">Đang tải lên...</p>}
      {error && <p className="text-body-sm text-error mt-1">{error}</p>}
    </div>
  );
}

export function StarRating({ value = 0, onChange, readOnly = false }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && onChange?.(star)}
          className={star <= Number(value || 0) ? 'text-warning' : 'text-outline'}
        >
          <Icon name="star" size={24} />
        </button>
      ))}
    </div>
  );
}
