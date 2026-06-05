import React, { useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import { uploadApi } from '../../services/api';

const CROP_SIZE = 280;
const OUTPUT_SIZE = 512;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export default function AvatarUploadField({ label, value, onChange, helper }) {
  const inputRef = useRef(null);
  const imageRef = useRef(null);
  const dragRef = useRef(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [imageMeta, setImageMeta] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  }, [sourceUrl]);

  const baseScale = imageMeta
    ? Math.max(CROP_SIZE / imageMeta.width, CROP_SIZE / imageMeta.height)
    : 1;
  const scale = baseScale * zoom;

  const clampCropOffset = (nextOffset, nextZoom = zoom, nextMeta = imageMeta) => {
    if (!nextMeta) return nextOffset;
    const nextBaseScale = Math.max(CROP_SIZE / nextMeta.width, CROP_SIZE / nextMeta.height);
    const renderedWidth = nextMeta.width * nextBaseScale * nextZoom;
    const renderedHeight = nextMeta.height * nextBaseScale * nextZoom;
    const maxX = Math.max(0, (renderedWidth - CROP_SIZE) / 2);
    const maxY = Math.max(0, (renderedHeight - CROP_SIZE) / 2);
    return {
      x: clamp(nextOffset.x, -maxX, maxX),
      y: clamp(nextOffset.y, -maxY, maxY),
    };
  };

  const resetCrop = (url) => {
    setSourceUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setImageMeta(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setError('');
  };

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    resetCrop(URL.createObjectURL(file));
  };

  const handleImageLoad = (event) => {
    const meta = {
      width: event.currentTarget.naturalWidth,
      height: event.currentTarget.naturalHeight,
    };
    setImageMeta(meta);
    setOffset(clampCropOffset({ x: 0, y: 0 }, 1, meta));
  };

  const startDrag = (event) => {
    if (!imageMeta) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offset,
    };
  };

  const moveDrag = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const nextOffset = {
      x: drag.offset.x + event.clientX - drag.startX,
      y: drag.offset.y + event.clientY - drag.startY,
    };
    setOffset(clampCropOffset(nextOffset));
  };

  const endDrag = (event) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  const handleZoom = (event) => {
    const nextZoom = Number(event.target.value);
    setZoom(nextZoom);
    setOffset((current) => clampCropOffset(current, nextZoom));
  };

  const closeCropper = () => {
    resetCrop('');
  };

  const applyCrop = async () => {
    const image = imageRef.current;
    if (!image || !imageMeta) return;

    setUploading(true);
    setError('');

    try {
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext('2d');
      const centerX = CROP_SIZE / 2 + offset.x;
      const centerY = CROP_SIZE / 2 + offset.y;
      const sourceX = (0 - centerX) / scale + imageMeta.width / 2;
      const sourceY = (0 - centerY) / scale + imageMeta.height / 2;
      const sourceSize = CROP_SIZE / scale;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      ctx.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      if (!blob) throw new Error('Cannot crop avatar');

      const file = new File([blob], `avatar-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const response = await uploadApi.uploadImage(file);
      onChange(response.data?.url || '');
      closeCropper();
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể cập nhật ảnh đại diện.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {label && <label className="block text-sm font-semibold text-gray-800">{label}</label>}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-50 shadow-sm flex items-center justify-center">
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <i className="fa-solid fa-user text-3xl text-gray-300" />
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
              <i className="fa-solid fa-upload" />
              {value ? 'Đổi ảnh' : 'Chọn ảnh'}
            </button>
            {value && (
              <button type="button" className="btn-secondary btn-sm" onClick={() => onChange('')} disabled={uploading}>
                Gỡ ảnh
              </button>
            )}
          </div>
          {helper && <p className="text-xs text-gray-500">{helper}</p>}
          {value && <p className="text-xs text-gray-400 break-all">{value}</p>}
        </div>
      </div>

      <Modal
        open={Boolean(sourceUrl)}
        onClose={uploading ? undefined : closeCropper}
        title="Căn ảnh đại diện"
        size="lg"
        footer={(
          <>
            <button type="button" className="btn-secondary" onClick={closeCropper} disabled={uploading}>Hủy</button>
            <button type="button" className="btn-primary flex items-center gap-2" onClick={applyCrop} disabled={uploading || !imageMeta}>
              {uploading && <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
              Dùng ảnh này
            </button>
          </>
        )}
      >
        <div className="space-y-5">
          <div className="flex justify-center">
            <div
              className="relative select-none touch-none overflow-hidden rounded-full border-4 border-white bg-gray-100 shadow-[0_0_0_1px_rgba(15,23,42,0.12),0_18px_45px_rgba(15,23,42,0.18)]"
              style={{ width: CROP_SIZE, height: CROP_SIZE }}
              onPointerDown={startDrag}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              {sourceUrl && (
                <img
                  ref={imageRef}
                  src={sourceUrl}
                  alt=""
                  className="absolute left-1/2 top-1/2 max-w-none cursor-grab active:cursor-grabbing"
                  style={{
                    width: imageMeta ? imageMeta.width : 'auto',
                    height: imageMeta ? imageMeta.height : 'auto',
                    transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                    transformOrigin: 'center',
                  }}
                  onLoad={handleImageLoad}
                  draggable={false}
                />
              )}
              <div className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-white/80" />
            </div>
          </div>

          <div className="mx-auto max-w-md space-y-2">
            <div className="flex items-center justify-between text-sm font-medium text-gray-700">
              <span>Thu phóng</span>
              <span>{Math.round(zoom * 100)}%</span>
            </div>
            <input
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              onChange={handleZoom}
              className="w-full accent-primary-600"
            />
            <p className="text-center text-xs text-gray-500">Kéo ảnh để căn khuôn mặt vào vòng tròn, sau đó bấm dùng ảnh này.</p>
          </div>

          {error && <p className="text-center text-sm text-red-600">{error}</p>}
        </div>
      </Modal>
    </div>
  );
}
