import React, { useState } from 'react';

/**
 * ImageLightbox - Click ảnh nhỏ để xem phóng to overlay.
 * Props:
 *   src: string (URL ảnh)
 *   alt: string
 *   className: string (class cho thumbnail)
 *   label: string (text hiển thị dưới thumbnail)
 */
export default function ImageLightbox({ src, alt = '', className = '', label }) {
  const [open, setOpen] = useState(false);

  if (!src) return null;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="group text-left">
        <img
          src={src}
          alt={alt}
          className={`rounded border border-warmborder object-cover cursor-pointer group-hover:ring-2 group-hover:ring-primary-400 transition-all ${className || 'w-20 h-14'}`}
        />
        {label && <p className="text-xs text-primary-600 mt-1 group-hover:underline">{label}</p>}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center text-warmink-2 hover:text-red-500 z-10"
            >
              <i className="fa-solid fa-xmark" />
            </button>
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain"
            />
            {alt && <p className="text-center text-white text-sm mt-2">{alt}</p>}
          </div>
        </div>
      )}
    </>
  );
}
