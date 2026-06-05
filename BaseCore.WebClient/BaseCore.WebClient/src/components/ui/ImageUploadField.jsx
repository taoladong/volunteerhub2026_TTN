import React, { useRef, useState } from 'react';
import { uploadApi } from '../../services/api';

export default function ImageUploadField({ label, value, onChange, helper, compact = false, variant = 'default' }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    setUploading(true);

    try {
      const response = await uploadApi.uploadImage(file);
      onChange(response.data?.url || '');
    } catch (err) {
      setError(err.response?.data?.message || 'Upload ảnh thất bại.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  if (variant === 'card') {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
        {label && <label className="block text-sm font-semibold text-gray-800 mb-2">{label}</label>}
        <div className="aspect-[4/3] rounded-xl border border-dashed border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
          {value ? (
            <img src={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center">
              <i className="fa-solid fa-image text-gray-300 text-3xl" />
              <p className="mt-2 text-xs text-gray-400">Chưa có ảnh</p>
            </div>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="btn-secondary btn-sm flex flex-1 items-center justify-center gap-2"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <span className="w-3.5 h-3.5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <i className="fa-solid fa-upload" />
            )}
            {uploading ? 'Đang upload...' : value ? 'Đổi ảnh' : 'Chọn ảnh'}
          </button>
          {value && (
            <button type="button" className="btn-secondary btn-sm px-3" onClick={() => onChange('')} disabled={uploading} title="Gỡ ảnh">
              <i className="fa-solid fa-xmark" />
            </button>
          )}
        </div>
        {helper && <p className="mt-2 text-xs text-gray-400">{helper}</p>}
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="w-full sm:w-32 h-24 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
          {value ? (
            <img src={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <i className="fa-solid fa-image text-gray-300 text-2xl" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary btn-sm flex items-center gap-2"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <span className="w-3.5 h-3.5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <i className="fa-solid fa-upload" />
              )}
              {uploading ? 'Đang upload...' : 'Chọn ảnh'}
            </button>
            {value && (
              <button type="button" className="btn-secondary btn-sm" onClick={() => onChange('')} disabled={uploading}>
                Gỡ ảnh
              </button>
            )}
          </div>
          {helper && <p className="text-xs text-gray-400">{helper}</p>}
          {value && <p className="text-xs text-gray-400 break-all">{value}</p>}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
