import React from 'react';

export default function Loading({ text = 'Đang tải...' }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-on-surface-variant text-sm">{text}</p>
    </div>
  );
}