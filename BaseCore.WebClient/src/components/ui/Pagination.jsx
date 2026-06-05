import React from 'react';

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center justify-center gap-1 mt-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1.5 rounded-lg text-sm border border-warmborder hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <i className="fa-solid fa-chevron-left" />
      </button>
      {start > 1 && <span className="px-2 text-warmink-3">...</span>}
      {pages.map(p => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`px-3 py-1.5 rounded-lg text-sm border ${p === page ? 'bg-primary-600 text-white border-primary-600' : 'border-warmborder hover:bg-surface-2'}`}
        >
          {p}
        </button>
      ))}
      {end < totalPages && <span className="px-2 text-warmink-3">...</span>}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1.5 rounded-lg text-sm border border-warmborder hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <i className="fa-solid fa-chevron-right" />
      </button>
    </div>
  );
}
