import React from 'react';

/**
 * Skeleton placeholder for loading states.
 *
 * @param {string}  className - Additional Tailwind classes.
 * @param {'text'|'card'|'avatar'|'stat'|'rect'} variant - Shape variant.
 * @param {number}  count - Repeat the skeleton N times (useful for lists).
 */
export default function Skeleton({ className = '', variant = 'rect', count = 1 }) {
  const base = 'animate-pulse bg-surface-2 rounded';

  const variantClass = {
    text: 'h-4 w-full rounded',
    card: 'h-32 w-full rounded-xl',
    avatar: 'h-10 w-10 rounded-full',
    stat: 'h-24 w-full rounded-xl',
    rect: 'h-6 w-full rounded',
  }[variant] || 'h-6 w-full rounded';

  const items = Array.from({ length: count }, (_, i) => (
    <div key={i} className={`${base} ${variantClass} ${className}`} />
  ));

  return count === 1 ? items[0] : <>{items}</>;
}

/**
 * Pre-built skeleton for Dashboard stat cards.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-28 hidden sm:block" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Skeleton variant="stat" />
        <Skeleton variant="stat" />
        <Skeleton variant="stat" />
        <Skeleton variant="stat" />
      </div>

      {/* Content skeleton */}
      <div className="card p-5 space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    </div>
  );
}

/**
 * Pre-built skeleton for event list items.
 */
export function EventListSkeleton({ count = 4 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card overflow-hidden">
          <Skeleton className="h-40 w-full rounded-none" />
          <div className="p-4 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}