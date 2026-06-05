import React, { useEffect } from 'react';

export default function Modal({ open, isOpen, onClose, title, children, footer, size = 'md' }) {
  const visible = open || isOpen;
  useEffect(() => {
    if (visible) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [visible]);

  if (!visible) return null;

  const sizeClass = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size] || 'max-w-lg';

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 2000 }}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-white rounded-xl shadow-xl w-full ${sizeClass} max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-warmborder">
          <h3 className="font-semibold text-warmink">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-2 text-warmink-3">
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>
        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>
        {/* Footer */}
        {footer && <div className="px-5 py-4 border-t border-warmborder flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
